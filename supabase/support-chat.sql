-- =============================================================================
-- DG Expert — Support chat (user <-> admin) (run AFTER schema.sql)
-- =============================================================================
-- A simple support/complaints channel. Each user has ONE support thread keyed by
-- their user id; messages flow between that user and admins. A user sees only
-- their own thread; admins see all threads. Realtime enabled. Idempotent.
-- =============================================================================

create table if not exists support_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_user uuid not null references auth.users(id) on delete cascade, -- whose support thread
  sender_id   uuid not null references auth.users(id) on delete cascade, -- who wrote it
  from_admin  boolean not null default false,
  body        text,
  image_url   text,
  created_at  timestamptz not null default now(),
  constraint support_messages_not_empty check (
    (body is not null and length(btrim(body)) > 0) or image_url is not null
  )
);
create index if not exists support_messages_thread_idx on support_messages(thread_user, created_at);

alter table support_messages enable row level security;

-- Read: the thread's owner, or any admin.
drop policy if exists support_select on support_messages;
create policy support_select on support_messages
  for select using (thread_user = auth.uid() or is_admin());

-- Insert: the owner posting to their own thread (from_admin=false), or an admin
-- posting to any thread (from_admin=true). Sender must be the current user.
drop policy if exists support_insert on support_messages;
create policy support_insert on support_messages
  for insert with check (
    sender_id = auth.uid()
    and (
      (thread_user = auth.uid() and from_admin = false)
      or (is_admin() and from_admin = true)
    )
  );

-- Notify the counterpart on a new message.
create or replace function support_messages_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.from_admin then
    -- admin replied -> notify the thread owner
    insert into notifications (user_id, title, body, link)
    values (new.thread_user, 'Support reply',
            coalesce(nullif(btrim(new.body), ''), 'Sent an image'), '/support');
  else
    -- user wrote -> notify admins (broadcast row)
    insert into notifications (user_id, title, body, link)
    values (null, 'New support message',
            coalesce(nullif(btrim(new.body), ''), 'Sent an image'), '/admin/support');
  end if;
  return new;
end $$;
drop trigger if exists trg_support_messages_notify on support_messages;
create trigger trg_support_messages_notify after insert on support_messages
  for each row execute function support_messages_notify();

-- Realtime
do $$ begin
  alter publication supabase_realtime add table support_messages;
exception when duplicate_object then null; end $$;

-- =============================================================================
-- Done. Users chat with support at /support; admins handle all at /admin/support.
-- =============================================================================
