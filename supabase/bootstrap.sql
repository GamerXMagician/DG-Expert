-- =============================================================================
-- DG Expert — Admin bootstrap
-- =============================================================================
-- The profiles table has a guard trigger (guard_profile_privileged) that stops a
-- logged-in user from changing their OWN role — a deliberate anti-escalation
-- control. But that also blocks the very first admin promotion when you run SQL
-- in the Supabase SQL Editor (which executes with your own auth.uid()).
--
-- This SECURITY DEFINER function runs as its OWNER, not as your session, so the
-- guard's is_admin() check is satisfied and the promotion succeeds. The change is
-- permanent — profiles.role stays 'admin' until explicitly changed.
--
-- Run this whole file ONCE to create the helpers. Then promote anyone, anytime:
--   select bootstrap_admin('you@example.com');
-- =============================================================================

create or replace function bootstrap_admin(target_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  updated int;
begin
  update profiles set role = 'admin' where email = target_email;
  get diagnostics updated = row_count;
  if updated = 0 then
    return format('No profile found for %s. Make sure the user has signed up first.', target_email);
  end if;
  return format('%s is now an admin. Log out and back in to load the role.', target_email);
end $$;

-- Optional: demote back to a normal user the same safe way.
create or replace function bootstrap_revoke_admin(target_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  updated int;
begin
  update profiles set role = 'user' where email = target_email;
  get diagnostics updated = row_count;
  if updated = 0 then
    return format('No profile found for %s.', target_email);
  end if;
  return format('%s is now a normal user.', target_email);
end $$;

-- =============================================================================
-- Usage:
--   select bootstrap_admin('you@example.com');       -- promote (permanent)
--   select bootstrap_revoke_admin('you@example.com'); -- demote
--   select email, role from profiles order by created_at;  -- verify
-- =============================================================================
