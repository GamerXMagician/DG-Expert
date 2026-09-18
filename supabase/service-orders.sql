-- =============================================================================
-- DG Expert — Service orders / enquiries (run AFTER vendors.sql)
-- =============================================================================
-- Lets a logged-in user click a vendor service and place an order / request help.
-- The order goes to the vendor (who owns the service) with a bell notification;
-- the vendor updates its status; the user tracks it in their order history.
-- Idempotent: guarded enum add, create-if-not-exists, drop-policy-if-exists.
-- =============================================================================

do $$ begin
  create type order_status as enum ('requested', 'accepted', 'in_progress', 'completed', 'cancelled', 'declined');
exception when duplicate_object then null; end $$;

create table if not exists service_orders (
  id            uuid primary key default gen_random_uuid(),
  service_id    uuid not null references vendor_services(id) on delete cascade,
  vendor_id     uuid not null references vendors(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  message       text,                         -- what the user needs / help request
  contact_email text,                         -- required at the UI; how the vendor replies
  contact_phone text,
  status        order_status not null default 'requested',
  vendor_notes  text,                         -- vendor's reply / update
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists service_orders_user_idx   on service_orders(user_id, created_at desc);
create index if not exists service_orders_vendor_idx on service_orders(vendor_id, created_at desc);
create index if not exists service_orders_service_idx on service_orders(service_id);

-- If the table already existed from an earlier run, add the email column.
alter table service_orders add column if not exists contact_email text;

drop trigger if exists trg_service_orders_updated on service_orders;
create trigger trg_service_orders_updated before update on service_orders
  for each row execute function set_updated_at();

-- Notify the vendor (its owning user) when a new order arrives.
create or replace function service_orders_notify_vendor()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_title text;
begin
  select user_id into v_owner from vendors where id = new.vendor_id;
  select title into v_title from vendor_services where id = new.service_id;
  if v_owner is not null then
    insert into notifications (user_id, title, body, link)
    values (v_owner, 'New service order',
            'A user has requested "' || coalesce(v_title, 'your service') || '".',
            '/vendor');
  end if;
  return new;
end $$;
drop trigger if exists trg_service_orders_notify on service_orders;
create trigger trg_service_orders_notify after insert on service_orders
  for each row execute function service_orders_notify_vendor();

-- Notify the user when the vendor changes the order status.
create or replace function service_orders_notify_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into notifications (user_id, title, body, link)
    values (new.user_id, 'Order update',
            'Your service order is now: ' || replace(new.status::text, '_', ' ') ||
            case when new.vendor_notes is not null then ' — ' || new.vendor_notes else '' end,
            '/orders');
  end if;
  return new;
end $$;
drop trigger if exists trg_service_orders_notify_user on service_orders;
create trigger trg_service_orders_notify_user after update on service_orders
  for each row execute function service_orders_notify_user();

-- RLS -------------------------------------------------------------------------
alter table service_orders enable row level security;

-- Read: the ordering user, the vendor that owns it, or an admin.
drop policy if exists orders_select on service_orders;
create policy orders_select on service_orders
  for select using (
    user_id = auth.uid()
    or is_admin()
    or exists (select 1 from vendors v where v.id = service_orders.vendor_id and v.user_id = auth.uid())
  );

-- Create: any authenticated user, for themselves, only on an APPROVED vendor's
-- PUBLISHED service. vendor_id must match the service's vendor.
drop policy if exists orders_insert on service_orders;
create policy orders_insert on service_orders
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from vendor_services s
      join vendors v on v.id = s.vendor_id
      where s.id = service_orders.service_id
        and s.vendor_id = service_orders.vendor_id
        and s.is_published = true
        and v.status = 'approved'
    )
  );

-- Update: the user may cancel their own order; the vendor may update status/notes
-- on orders for their services; admins anything.
drop policy if exists orders_update on service_orders;
create policy orders_update on service_orders
  for update using (
    user_id = auth.uid()
    or is_admin()
    or exists (select 1 from vendors v where v.id = service_orders.vendor_id and v.user_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    or is_admin()
    or exists (select 1 from vendors v where v.id = service_orders.vendor_id and v.user_id = auth.uid())
  );

-- Realtime
do $$ begin
  alter publication supabase_realtime add table service_orders;
exception when duplicate_object then null; end $$;

-- =============================================================================
-- Done. Users order at /services -> /orders (history); vendors see & manage
-- incoming orders in their /vendor dashboard.
-- =============================================================================
