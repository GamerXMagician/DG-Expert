-- =============================================================================
-- DG Expert — Per-order chat (run AFTER service-orders.sql)
-- =============================================================================
-- Adds a private 1:1 chat thread tied to each service order. Only the ordering
-- user and the vendor's owner can read/write it; admins can read every thread.
-- Supports text and image messages (images live in the `order-chat` storage
-- bucket). Realtime enabled. Idempotent.
-- =============================================================================

create table if not exists order_messages (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references service_orders(id) on delete cascade,
  sender_id  uuid not null references auth.users(id) on delete cascade,
  body       text,
  image_url  text,                    -- public URL of an uploaded image, if any
  created_at timestamptz not null default now(),
  -- a message must carry text or an image (or both)
  constraint order_messages_not_empty check (
    (body is not null and length(btrim(body)) > 0) or image_url is not null
  )
);
create index if not exists order_messages_order_idx on order_messages(order_id, created_at);

-- Helper: is the current user a participant in (or admin over) this order?
create or replace function can_access_order(p_order uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from service_orders o
    where o.id = p_order
      and (
        o.user_id = auth.uid()
        or is_admin()
        or exists (select 1 from vendors v where v.id = o.vendor_id and v.user_id = auth.uid())
      )
  );
$$;

-- RLS -------------------------------------------------------------------------
alter table order_messages enable row level security;

-- Read: any participant of the order, or an admin.
drop policy if exists order_messages_select on order_messages;
create policy order_messages_select on order_messages
  for select using (can_access_order(order_id));

-- Insert: the sender must be the current user AND a participant of the order.
-- Admins are participants via can_access_order, but the app never posts as admin
-- (admin view is read-only in the UI).
drop policy if exists order_messages_insert on order_messages;
create policy order_messages_insert on order_messages
  for insert with check (
    sender_id = auth.uid() and can_access_order(order_id)
  );

-- Notify the OTHER party (not the sender) that a new message arrived.
create or replace function order_messages_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o_user   uuid;
  v_owner  uuid;
  recipient uuid;
  link_to  text;
begin
  select o.user_id, v.user_id into o_user, v_owner
  from service_orders o join vendors v on v.id = o.vendor_id
  where o.id = new.order_id;

  if new.sender_id = o_user then
    recipient := v_owner;         -- buyer sent -> notify vendor
    link_to := '/vendor';
  else
    recipient := o_user;          -- vendor sent -> notify buyer
    link_to := '/orders';
  end if;

  if recipient is not null and recipient <> new.sender_id then
    insert into notifications (user_id, title, body, link)
    values (recipient, 'New message',
            coalesce(nullif(btrim(new.body), ''), 'Sent an image'),
            link_to);
  end if;
  return new;
end $$;
drop trigger if exists trg_order_messages_notify on order_messages;
create trigger trg_order_messages_notify after insert on order_messages
  for each row execute function order_messages_notify();

-- Realtime
do $$ begin
  alter publication supabase_realtime add table order_messages;
exception when duplicate_object then null; end $$;

-- Storage bucket for chat images -------------------------------------------------
insert into storage.buckets (id, name, public)
values ('order-chat', 'order-chat', true)
on conflict (id) do nothing;

-- Files are stored under <order_id>/<filename>. A user may upload only into an
-- order they can access; anyone who can access the order can read its files.
-- (Bucket is public-read for simplicity of rendering; write is gated by RLS.)
drop policy if exists order_chat_read on storage.objects;
create policy order_chat_read on storage.objects
  for select using (bucket_id = 'order-chat');

drop policy if exists order_chat_insert on storage.objects;
create policy order_chat_insert on storage.objects
  for insert with check (
    bucket_id = 'order-chat'
    and can_access_order((split_part(name, '/', 1))::uuid)
  );

-- =============================================================================
-- Done. Buyer & vendor chat per order from /orders and /vendor; admins browse
-- all threads read-only at /admin/chats.
-- =============================================================================
