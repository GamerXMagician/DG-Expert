-- =============================================================================
-- DG Expert — Plan limits: vendor service-listing cap (run AFTER vendors.sql)
-- =============================================================================
-- Free vendor: max 3 services. Unlimited: no cap.
-- View limits (5 services/OEMs/knowledge for free users) are enforced in the UI
-- since they are read-only browse caps, not security boundaries. This file
-- enforces the WRITE cap (service listings) in the database so it can't be
-- bypassed from the client.
-- Idempotent.
-- =============================================================================

-- 1. Add the limit to plans and set values.
alter table plans add column if not exists service_listing_limit integer;

update plans set service_listing_limit = 3    where code = 'free';
update plans set service_listing_limit = null where code = 'unlimited';

-- 2. Helper: the caller's service-listing limit (null = unlimited).
create or replace function my_service_listing_limit()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select service_listing_limit from my_plan();
$$;

-- 3. Trigger: block a new service when the vendor's plan cap is reached.
create or replace function enforce_service_listing_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_limit integer;
  v_count integer;
begin
  -- who owns this vendor, and what is THEIR plan limit?
  select user_id into v_owner from vendors where id = new.vendor_id;

  select service_listing_limit into v_limit
  from subscriptions s join plans p on p.id = s.plan_id
  where s.user_id = v_owner
    and s.status = 'active'
    and (s.expires_at is null or s.expires_at > now())
  limit 1;

  -- default to the free cap if no active subscription row was found
  if v_limit is null then
    -- distinguish "unlimited plan" (explicit null) from "no row": check plan code
    if exists (
      select 1 from subscriptions s join plans p on p.id = s.plan_id
      where s.user_id = v_owner and p.code = 'unlimited'
        and s.status = 'active' and (s.expires_at is null or s.expires_at > now())
    ) then
      return new; -- unlimited
    end if;
    select service_listing_limit into v_limit from plans where code = 'free';
  end if;

  if v_limit is not null then
    select count(*) into v_count from vendor_services where vendor_id = new.vendor_id;
    if v_count >= v_limit then
      raise exception 'Your plan allows a maximum of % service listings. Upgrade to Unlimited to add more.', v_limit;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_service_listing_limit on vendor_services;
create trigger trg_service_listing_limit before insert on vendor_services
  for each row execute function enforce_service_listing_limit();

-- =============================================================================
-- Done. Free vendors are capped at 3 listings (DB-enforced). The UI also
-- disables the add button past the cap and shows an upgrade prompt.
-- =============================================================================
