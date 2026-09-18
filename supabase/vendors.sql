-- =============================================================================
-- DG Expert — Vendor marketplace (additive migration)
-- =============================================================================
-- Run AFTER schema.sql (and seed.sql) on your project via the SQL Editor.
-- Safe/idempotent: guarded enum adds, create-if-not-exists, drop-policy-if-exists.
--
-- Adds:
--   * 'vendor' to the user_role enum
--   * vendor_status enum (pending/approved/rejected/suspended)
--   * vendors table (1 profile -> 1 vendor application/account)
--   * vendor_services table (services + pricing a vendor lists)
--   * is_approved_vendor() helper
--   * RLS: vendors manage their own; admins review/approve; all authenticated
--     users see APPROVED vendors' PUBLISHED services
--   * Notifications to admins on new application; to vendor on approve/reject
--   * Realtime on vendors + vendor_services
-- =============================================================================

-- 1. Extend the role enum ------------------------------------------------------
do $$ begin
  alter type user_role add value if not exists 'vendor';
exception when others then null; end $$;

do $$ begin
  create type vendor_status as enum ('pending', 'approved', 'rejected', 'suspended');
exception when duplicate_object then null; end $$;

-- 2. vendors -------------------------------------------------------------------
create table if not exists vendors (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null unique references auth.users(id) on delete cascade,
  business_name  text not null,
  category       text,                       -- e.g. Service / Parts / Rental / Installation
  description    text,
  contact_email  text,
  contact_phone  text,
  website        text,
  location       text,
  status         vendor_status not null default 'pending',
  review_notes   text,                        -- admin's reason on reject/approve
  reviewed_by    uuid references profiles(id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists vendors_status_idx on vendors(status);
create index if not exists vendors_user_idx on vendors(user_id);

drop trigger if exists trg_vendors_updated on vendors;
create trigger trg_vendors_updated before update on vendors
  for each row execute function set_updated_at();

-- 3. vendor_services -----------------------------------------------------------
create table if not exists vendor_services (
  id            uuid primary key default gen_random_uuid(),
  vendor_id     uuid not null references vendors(id) on delete cascade,
  title         text not null,
  category      text,
  description   text,
  price_amount  numeric(12,2),
  price_currency text not null default 'USD',
  price_unit    text,                         -- e.g. "per visit", "per hour", "fixed"
  oem_id        uuid references oems(id) on delete set null,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists vendor_services_vendor_idx on vendor_services(vendor_id);
create index if not exists vendor_services_published_idx on vendor_services(is_published);

drop trigger if exists trg_vendor_services_updated on vendor_services;
create trigger trg_vendor_services_updated before update on vendor_services
  for each row execute function set_updated_at();

-- 4. Helper: is the caller an APPROVED vendor? --------------------------------
create or replace function is_approved_vendor()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from vendors
    where user_id = auth.uid() and status = 'approved'
  );
$$;

-- Stamp review metadata + notify the vendor when status changes.
create or replace function vendors_review_stamp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    new.reviewed_at = now();
    if auth.uid() is not null then new.reviewed_by = auth.uid(); end if;

    if new.status = 'approved' then
      -- Grant the vendor role on the profile (bypasses the self-role guard
      -- because this is SECURITY DEFINER and the change is admin-initiated).
      update profiles set role = 'vendor' where id = new.user_id and role <> 'admin';
      insert into notifications (user_id, title, body, link)
      values (new.user_id, 'Vendor account approved',
              'Your vendor account "' || new.business_name || '" is approved. You can now list services.',
              '/vendor');
    elsif new.status in ('rejected', 'suspended') then
      -- Revoke the vendor role (never touch an admin).
      update profiles set role = 'user' where id = new.user_id and role = 'vendor';
      insert into notifications (user_id, title, body, link)
      values (new.user_id, 'Vendor application update',
              coalesce(new.review_notes, 'Your vendor application was not approved.'),
              '/vendor');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_vendors_review on vendors;
create trigger trg_vendors_review before update on vendors
  for each row execute function vendors_review_stamp();

-- Notify admins when a new application arrives (broadcast row for admins).
create or replace function vendors_notify_admins()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, title, body, link)
  values (null, 'New vendor application',
          new.business_name || ' has applied to become a vendor.',
          '/admin/vendors');
  return new;
end $$;
drop trigger if exists trg_vendors_notify_admins on vendors;
create trigger trg_vendors_notify_admins after insert on vendors
  for each row execute function vendors_notify_admins();

-- 5. RLS -----------------------------------------------------------------------
alter table vendors         enable row level security;
alter table vendor_services enable row level security;

-- ---- vendors ----
-- Read: the vendor's own row; any authenticated user can see APPROVED vendors; admins all.
drop policy if exists vendors_select on vendors;
create policy vendors_select on vendors
  for select using (user_id = auth.uid() or status = 'approved' or is_admin());

-- A user creates their OWN vendor application, always as pending.
drop policy if exists vendors_insert on vendors;
create policy vendors_insert on vendors
  for insert with check (user_id = auth.uid() and status = 'pending');

-- Vendor may edit their own PROFILE fields; admins may edit anything.
-- The status column is protected for non-admins by a trigger below.
drop policy if exists vendors_update_own on vendors;
create policy vendors_update_own on vendors
  for update using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- Guard: a non-admin cannot change their own vendor status (anti self-approval).
create or replace function guard_vendor_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() and new.status is distinct from old.status then
    raise exception 'You cannot change your own vendor approval status.';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_vendor_status on vendors;
create trigger trg_guard_vendor_status before update on vendors
  for each row execute function guard_vendor_status();

-- ---- vendor_services ----
-- Read: published services of APPROVED vendors are visible to everyone;
--       a vendor sees their own (any status); admins see all.
drop policy if exists services_select on vendor_services;
create policy services_select on vendor_services
  for select using (
    is_admin()
    or exists (select 1 from vendors v where v.id = vendor_services.vendor_id and v.user_id = auth.uid())
    or (
      is_published = true
      and exists (select 1 from vendors v where v.id = vendor_services.vendor_id and v.status = 'approved')
    )
  );

-- Write: only an APPROVED vendor, and only on THEIR OWN vendor row.
drop policy if exists services_write on vendor_services;
create policy services_write on vendor_services
  for all using (
    exists (
      select 1 from vendors v
      where v.id = vendor_services.vendor_id
        and v.user_id = auth.uid()
        and v.status = 'approved'
    )
  )
  with check (
    exists (
      select 1 from vendors v
      where v.id = vendor_services.vendor_id
        and v.user_id = auth.uid()
        and v.status = 'approved'
    )
  );
drop policy if exists services_admin on vendor_services;
create policy services_admin on vendor_services
  for all using (is_admin()) with check (is_admin());

-- 6. Realtime ------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table vendors;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table vendor_services;
exception when duplicate_object then null; end $$;

-- =============================================================================
-- Done. A user signs up (or logs in) normally, applies as a vendor from
-- /vendor, an admin approves at /admin/vendors, then the vendor lists services
-- which appear to all users at /services.
-- =============================================================================
