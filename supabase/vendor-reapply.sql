-- =============================================================================
-- DG Expert — Allow rejected/suspended vendors to re-apply (run AFTER vendors.sql)
-- =============================================================================
-- The anti-self-approval guard blocked a vendor from changing their own status
-- at all. This relaxes it: a vendor may move their OWN status from
-- rejected/suspended back to 'pending' (re-apply). Any other self-initiated
-- status change is still blocked (they still can't approve themselves).
-- Idempotent.
-- =============================================================================

create or replace function guard_vendor_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() and new.status is distinct from old.status then
    -- The only self-service transition allowed: re-apply after a rejection or
    -- suspension by moving back to 'pending'.
    if new.status = 'pending' and old.status in ('rejected', 'suspended') then
      return new;
    end if;
    raise exception 'You cannot change your own vendor approval status.';
  end if;
  return new;
end $$;

-- =============================================================================
-- Done. Rejected/suspended vendors can now re-apply from their Profile page.
-- =============================================================================
