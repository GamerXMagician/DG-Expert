-- =============================================================================
-- DG Expert — Vendor approval EMAIL dispatch (run AFTER vendors.sql)
-- =============================================================================
-- The in-app notification already fires from vendors_review_stamp(). This adds
-- the EMAIL: on approval/rejection the DB calls the `vendor-email` Edge Function
-- via pg_net, which sends the mail through your provider (Resend).
--
-- Prereqs:
--   1) Deploy the function:  supabase functions deploy vendor-email --no-verify-jwt
--   2) Set its secrets:      RESEND_API_KEY, VENDOR_EMAIL_FROM, VENDOR_EMAIL_HOOK_SECRET
--   3) Fill app_config below with your Functions URL + the SAME hook secret.
-- =============================================================================

create extension if not exists pg_net;

-- Private config: holds the function URL + shared secret (NOT exposed to clients).
create table if not exists app_config (
  key   text primary key,
  value text not null
);
alter table app_config enable row level security;
-- No policies => only the service role / SECURITY DEFINER functions can read it.

-- >>> EDIT THESE TWO ROWS <<<
--   vendor_email_url : https://<PROJECT_REF>.functions.supabase.co/vendor-email
--   vendor_email_secret : the SAME value you set as VENDOR_EMAIL_HOOK_SECRET
insert into app_config (key, value) values
  ('vendor_email_url',    'https://tephezunccvkcnheiarw.functions.supabase.co/vendor-email'),
  ('vendor_email_secret', 'CHANGE_ME_TO_A_LONG_RANDOM_STRING')
on conflict (key) do update set value = excluded.value;

-- Dispatch helper: fire-and-forget HTTP POST to the Edge Function.
create or replace function send_vendor_email(p_to text, p_status text, p_business text, p_notes text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
begin
  select value into v_url    from app_config where key = 'vendor_email_url';
  select value into v_secret from app_config where key = 'vendor_email_secret';
  if v_url is null or p_to is null then
    return; -- not configured or no address; skip silently
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook-secret', coalesce(v_secret, '')),
    body    := jsonb_build_object('to', p_to, 'status', p_status, 'business_name', p_business, 'notes', p_notes)
  );
end $$;

-- AFTER-update trigger that fires the email once the status change is committed
-- to the row. (Separate from the BEFORE trigger that writes the in-app notice.)
create or replace function vendors_email_on_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if new.status is distinct from old.status
     and new.status in ('approved', 'rejected') then
    -- Prefer the vendor's contact email; fall back to their auth email.
    v_email := coalesce(
      new.contact_email,
      (select email from profiles where id = new.user_id)
    );
    perform send_vendor_email(v_email, new.status::text, new.business_name, new.review_notes);
  end if;
  return new;
end $$;

drop trigger if exists trg_vendors_email on vendors;
create trigger trg_vendors_email after update on vendors
  for each row execute function vendors_email_on_review();

-- =============================================================================
-- Done. Approving/rejecting a vendor now: (1) writes an in-app notification
-- (vendors_review_stamp), and (2) sends an email (this trigger -> Edge Function).
-- If RESEND_API_KEY is unset, the function no-ops so nothing breaks.
-- =============================================================================
