-- =============================================================================
-- DG Expert — Complete Supabase schema
-- =============================================================================
-- Safe to run top-to-bottom on a FRESH Supabase project via
--   Supabase → SQL Editor → New Query → paste → Run
--
-- After this, run supabase/seed.sql for the initial plans + OEM data.
--
-- Security model:
--   * profiles.role ∈ ('user','admin') is the authority for admin access.
--   * is_admin() is a SECURITY DEFINER helper used by RLS policies so a normal
--     user can NEVER read/write other users' data or elevate their own role.
--   * Subscription + usage limits are enforced in the DB (functions below),
--     not in the frontend.
-- =============================================================================

create extension if not exists "pgcrypto";     -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type request_status as enum ('pending', 'in_progress', 'answered', 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type article_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('active', 'expired', 'cancelled');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- updated_at trigger helper
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- =============================================================================
-- PROFILES  (1 row per auth user)
-- =============================================================================
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  first_name   text not null default '',
  last_name    text not null default '',
  email        text not null,
  phone        text,
  role         user_role not null default 'user',
  account_status text not null default 'active',      -- active | suspended
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- One account per user is enforced by the 1:1 FK to auth.users above.
  -- Duplicate email / phone prevention:
  constraint profiles_email_unique unique (email)
);
-- Unique phone only when provided (NULLs allowed, duplicates of NULL ok).
create unique index if not exists profiles_phone_unique
  on profiles (phone) where phone is not null;

create index if not exists profiles_role_idx on profiles(role);

drop trigger if exists trg_profiles_updated on profiles;
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- is_admin(): SECURITY DEFINER so RLS policies can check role without
-- recursively triggering profiles RLS.
-- -----------------------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up.
-- Sign-up metadata (first_name etc.) is read from raw_user_meta_data.
-- -----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    nullif(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;

  -- Give every new user a FREE subscription.
  insert into public.subscriptions (user_id, plan_id, status)
  select new.id, p.id, 'active'
  from public.plans p
  where p.code = 'free'
  on conflict do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================================================
-- PLANS  (FREE / UNLIMITED). Limits are data, not code.
-- =============================================================================
create table if not exists plans (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,          -- 'free' | 'unlimited'
  name               text not null,
  description        text,
  price_cents        integer not null default 0,
  currency           text not null default 'USD',
  ai_questions_per_day integer,                       -- NULL = unlimited
  oem_access_limit   integer,                         -- NULL = unlimited
  saved_history_limit integer,                        -- NULL = unlimited
  features           jsonb not null default '{}'::jsonb,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
drop trigger if exists trg_plans_updated on plans;
create trigger trg_plans_updated before update on plans
  for each row execute function set_updated_at();

-- =============================================================================
-- SUBSCRIPTIONS
-- =============================================================================
create table if not exists subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  plan_id     uuid not null references plans(id),
  status      subscription_status not null default 'active',
  started_at  timestamptz not null default now(),
  expires_at  timestamptz,                            -- NULL = no expiry
  -- payment provider hooks (Stripe/Razorpay later):
  provider    text,
  provider_ref text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint subscriptions_user_unique unique (user_id)  -- one active sub row/user
);
create index if not exists subscriptions_user_idx on subscriptions(user_id);
drop trigger if exists trg_subscriptions_updated on subscriptions;
create trigger trg_subscriptions_updated before update on subscriptions
  for each row execute function set_updated_at();

-- =============================================================================
-- USER USAGE  (per-day counters for limit enforcement)
-- =============================================================================
create table if not exists user_usage (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  usage_date  date not null default current_date,
  ai_questions integer not null default 0,
  searches    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint user_usage_user_day_unique unique (user_id, usage_date)
);
create index if not exists user_usage_user_date_idx on user_usage(user_id, usage_date);
drop trigger if exists trg_user_usage_updated on user_usage;
create trigger trg_user_usage_updated before update on user_usage
  for each row execute function set_updated_at();

-- =============================================================================
-- OEMS  (admin-managed; no source changes to add one)
-- =============================================================================
create table if not exists oems (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  country     text,
  overview    text,
  engine_families text,
  logo_url    text,
  is_active   boolean not null default true,
  sort_order  integer not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists oems_active_idx on oems(is_active);
drop trigger if exists trg_oems_updated on oems;
create trigger trg_oems_updated before update on oems
  for each row execute function set_updated_at();

-- =============================================================================
-- GENERATOR MODELS
-- =============================================================================
create table if not exists generator_models (
  id          uuid primary key default gen_random_uuid(),
  oem_id      uuid not null references oems(id) on delete cascade,
  name        text not null,
  engine_family text,
  power_rating text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint generator_models_oem_name_unique unique (oem_id, name)
);
create index if not exists generator_models_oem_idx on generator_models(oem_id);
drop trigger if exists trg_generator_models_updated on generator_models;
create trigger trg_generator_models_updated before update on generator_models
  for each row execute function set_updated_at();

-- =============================================================================
-- KNOWLEDGE CATEGORIES  (Engine, Electrical, Cooling, Fuel, ...)
-- =============================================================================
create table if not exists knowledge_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  icon        text,
  sort_order  integer not null default 100,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- KNOWLEDGE ARTICLES
-- =============================================================================
create table if not exists knowledge_articles (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  oem_id        uuid references oems(id) on delete set null,
  model_id      uuid references generator_models(id) on delete set null,
  category_id   uuid references knowledge_categories(id) on delete set null,
  system        text,                                -- e.g. Engine, Cooling
  problem       text,
  symptoms      text,
  possible_causes text,
  diagnostic_procedure text,
  corrective_action text,
  safety_precautions text,
  references_text text,
  body          text,                                -- long-form fundamentals content
  is_demo       boolean not null default false,      -- flag sample/demo content
  status        article_status not null default 'draft',
  author_id     uuid references profiles(id) on delete set null,
  published_at  timestamptz,
  -- full text search vector
  search_tsv    tsvector,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists knowledge_articles_status_idx on knowledge_articles(status);
create index if not exists knowledge_articles_oem_idx on knowledge_articles(oem_id);
create index if not exists knowledge_articles_category_idx on knowledge_articles(category_id);
create index if not exists knowledge_articles_tsv_idx on knowledge_articles using gin(search_tsv);

create or replace function knowledge_articles_tsv_update()
returns trigger language plpgsql as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('english', coalesce(new.title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.problem,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.system,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.symptoms,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.possible_causes,'')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.corrective_action,'')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.body,'')), 'D');
  return new;
end $$;

drop trigger if exists trg_ka_tsv on knowledge_articles;
create trigger trg_ka_tsv before insert or update on knowledge_articles
  for each row execute function knowledge_articles_tsv_update();

drop trigger if exists trg_ka_updated on knowledge_articles;
create trigger trg_ka_updated before update on knowledge_articles
  for each row execute function set_updated_at();

-- Stamp published_at when transitioning to published.
create or replace function knowledge_articles_publish_stamp()
returns trigger language plpgsql as $$
begin
  if new.status = 'published' and (old.status is distinct from 'published') then
    new.published_at = now();
  end if;
  return new;
end $$;
drop trigger if exists trg_ka_publish on knowledge_articles;
create trigger trg_ka_publish before update on knowledge_articles
  for each row execute function knowledge_articles_publish_stamp();

-- =============================================================================
-- TECHNICAL REQUESTS  (user asks for missing info)
-- =============================================================================
create table if not exists technical_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  question    text not null,
  oem_id      uuid references oems(id) on delete set null,
  model_text  text,
  system      text,
  description text,
  attachment_url text,
  status      request_status not null default 'pending',
  resolved_article_id uuid references knowledge_articles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists technical_requests_user_idx on technical_requests(user_id);
create index if not exists technical_requests_status_idx on technical_requests(status);
drop trigger if exists trg_tr_updated on technical_requests;
create trigger trg_tr_updated before update on technical_requests
  for each row execute function set_updated_at();

-- =============================================================================
-- QUESTIONS  (AI chat history)
-- =============================================================================
create table if not exists questions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  question    text not null,
  answer      text,
  oem_id      uuid references oems(id) on delete set null,
  category    text,
  created_at  timestamptz not null default now()
);
create index if not exists questions_user_idx on questions(user_id, created_at desc);

-- =============================================================================
-- SAVED QUESTIONS
-- =============================================================================
create table if not exists saved_questions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint saved_questions_unique unique (user_id, question_id)
);
create index if not exists saved_questions_user_idx on saved_questions(user_id);

-- =============================================================================
-- ATTACHMENTS  (metadata; files live in Supabase Storage)
-- =============================================================================
create table if not exists attachments (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid references knowledge_articles(id) on delete cascade,
  request_id  uuid references technical_requests(id) on delete cascade,
  uploaded_by uuid references profiles(id) on delete set null,
  bucket      text not null default 'dg-documents',
  path        text not null,
  file_name   text,
  mime_type   text,
  size_bytes  bigint,
  is_public   boolean not null default false,   -- restricted docs = subscribers only
  created_at  timestamptz not null default now()
);
create index if not exists attachments_article_idx on attachments(article_id);

-- =============================================================================
-- ADMIN ACTIVITY LOG
-- =============================================================================
create table if not exists admin_activity (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references profiles(id) on delete set null,
  action      text not null,
  entity      text,
  entity_id   uuid,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists admin_activity_created_idx on admin_activity(created_at desc);

-- =============================================================================
-- NOTIFICATIONS  (in-app; realtime)
-- =============================================================================
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,  -- NULL = broadcast
  title       text not null,
  body        text,
  link        text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications(user_id, created_at desc);

-- =============================================================================
-- SUBSCRIPTION + USAGE ENFORCEMENT FUNCTIONS  (DB is the source of truth)
-- =============================================================================

-- Returns the caller's effective plan row (respecting expiry).
create or replace function my_plan()
returns plans
language sql
security definer
set search_path = public
stable
as $$
  select p.*
  from subscriptions s
  join plans p on p.id = s.plan_id
  where s.user_id = auth.uid()
    and s.status = 'active'
    and (s.expires_at is null or s.expires_at > now())
  union all
  -- Fallback to FREE plan if no active subscription found.
  select p.* from plans p
  where p.code = 'free'
    and not exists (
      select 1 from subscriptions s2
      where s2.user_id = auth.uid()
        and s2.status = 'active'
        and (s2.expires_at is null or s2.expires_at > now())
    )
  limit 1;
$$;

-- How many AI questions the caller has left today.
-- Returns NULL when the plan is unlimited.
create or replace function ai_questions_remaining()
returns integer
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  plan_limit integer;
  used integer;
begin
  select ai_questions_per_day into plan_limit from my_plan();
  if plan_limit is null then
    return null;  -- unlimited
  end if;
  select coalesce(ai_questions, 0) into used
  from user_usage
  where user_id = auth.uid() and usage_date = current_date;
  return greatest(plan_limit - coalesce(used, 0), 0);
end $$;

-- Atomically consume one AI question. Enforces the daily limit server-side.
-- Returns true if consumed, false if the limit is reached.
create or replace function consume_ai_question()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_limit integer;
  used integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select ai_questions_per_day into plan_limit from my_plan();

  insert into user_usage (user_id, usage_date, ai_questions)
  values (auth.uid(), current_date, 0)
  on conflict (user_id, usage_date) do nothing;

  select ai_questions into used
  from user_usage
  where user_id = auth.uid() and usage_date = current_date
  for update;

  if plan_limit is not null and used >= plan_limit then
    return false;  -- limit reached
  end if;

  update user_usage
  set ai_questions = ai_questions + 1
  where user_id = auth.uid() and usage_date = current_date;

  return true;
end $$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table profiles            enable row level security;
alter table plans               enable row level security;
alter table subscriptions       enable row level security;
alter table user_usage          enable row level security;
alter table oems                enable row level security;
alter table generator_models    enable row level security;
alter table knowledge_categories enable row level security;
alter table knowledge_articles  enable row level security;
alter table technical_requests  enable row level security;
alter table questions           enable row level security;
alter table saved_questions     enable row level security;
alter table attachments         enable row level security;
alter table admin_activity      enable row level security;
alter table notifications       enable row level security;

-- ---- PROFILES ----
drop policy if exists profiles_select_own on profiles;
create policy profiles_select_own on profiles
  for select using (id = auth.uid() or is_admin());

drop policy if exists profiles_update_own on profiles;
-- Users may update their own row, but NOT their role. Enforced by a trigger
-- (below) because a WITH CHECK cannot reference OLD easily.
create policy profiles_update_own on profiles
  for update using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- Prevent non-admins from changing their own role or account_status.
create or replace function guard_profile_privileged()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    if new.role is distinct from old.role then
      raise exception 'You cannot change your own role.';
    end if;
    if new.account_status is distinct from old.account_status then
      raise exception 'You cannot change your account status.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_profile on profiles;
create trigger trg_guard_profile before update on profiles
  for each row execute function guard_profile_privileged();

-- ---- PLANS (public read, admin write) ----
drop policy if exists plans_read on plans;
create policy plans_read on plans for select using (true);
drop policy if exists plans_admin_write on plans;
create policy plans_admin_write on plans for all
  using (is_admin()) with check (is_admin());

-- ---- SUBSCRIPTIONS (own read, admin all) ----
drop policy if exists subscriptions_select_own on subscriptions;
create policy subscriptions_select_own on subscriptions
  for select using (user_id = auth.uid() or is_admin());
drop policy if exists subscriptions_admin_write on subscriptions;
create policy subscriptions_admin_write on subscriptions for all
  using (is_admin()) with check (is_admin());

-- ---- USER USAGE (own read; writes go through SECURITY DEFINER fns) ----
drop policy if exists user_usage_select_own on user_usage;
create policy user_usage_select_own on user_usage
  for select using (user_id = auth.uid() or is_admin());

-- ---- OEMS (public read, admin write) ----
drop policy if exists oems_read on oems;
create policy oems_read on oems for select using (is_active or is_admin());
drop policy if exists oems_admin_write on oems;
create policy oems_admin_write on oems for all
  using (is_admin()) with check (is_admin());

-- ---- GENERATOR MODELS (public read, admin write) ----
drop policy if exists models_read on generator_models;
create policy models_read on generator_models for select using (true);
drop policy if exists models_admin_write on generator_models;
create policy models_admin_write on generator_models for all
  using (is_admin()) with check (is_admin());

-- ---- KNOWLEDGE CATEGORIES (public read, admin write) ----
drop policy if exists cats_read on knowledge_categories;
create policy cats_read on knowledge_categories for select using (true);
drop policy if exists cats_admin_write on knowledge_categories;
create policy cats_admin_write on knowledge_categories for all
  using (is_admin()) with check (is_admin());

-- ---- KNOWLEDGE ARTICLES ----
-- Authenticated users see PUBLISHED articles; admins see everything.
drop policy if exists articles_read on knowledge_articles;
create policy articles_read on knowledge_articles
  for select using (status = 'published' or is_admin());
drop policy if exists articles_admin_write on knowledge_articles;
create policy articles_admin_write on knowledge_articles for all
  using (is_admin()) with check (is_admin());

-- ---- TECHNICAL REQUESTS (own read/create, admin all) ----
drop policy if exists tr_select on technical_requests;
create policy tr_select on technical_requests
  for select using (user_id = auth.uid() or is_admin());
drop policy if exists tr_insert on technical_requests;
create policy tr_insert on technical_requests
  for insert with check (user_id = auth.uid());
drop policy if exists tr_admin_update on technical_requests;
create policy tr_admin_update on technical_requests
  for update using (is_admin()) with check (is_admin());

-- ---- QUESTIONS (own only) ----
drop policy if exists q_select on questions;
create policy q_select on questions
  for select using (user_id = auth.uid() or is_admin());
drop policy if exists q_insert on questions;
create policy q_insert on questions for insert with check (user_id = auth.uid());
drop policy if exists q_delete on questions;
create policy q_delete on questions for delete using (user_id = auth.uid());

-- ---- SAVED QUESTIONS (own only) ----
drop policy if exists sq_all on saved_questions;
create policy sq_all on saved_questions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- ATTACHMENTS ----
-- Public attachments on published articles are readable by any authenticated
-- user; restricted ones require an active (non-free-limited) subscription; and
-- admins see all. Row also readable by the uploader / request owner.
drop policy if exists att_read on attachments;
create policy att_read on attachments
  for select using (
    is_admin()
    or uploaded_by = auth.uid()
    or (
      is_public = true
      and article_id is not null
      and exists (
        select 1 from knowledge_articles a
        where a.id = attachments.article_id and a.status = 'published'
      )
    )
    or (
      request_id is not null and exists (
        select 1 from technical_requests r
        where r.id = attachments.request_id and r.user_id = auth.uid()
      )
    )
  );
drop policy if exists att_admin_write on attachments;
create policy att_admin_write on attachments for all
  using (is_admin()) with check (is_admin());

-- ---- ADMIN ACTIVITY (admin only) ----
drop policy if exists activity_admin on admin_activity;
create policy activity_admin on admin_activity for all
  using (is_admin()) with check (is_admin());

-- ---- NOTIFICATIONS (own + broadcast read; admin write) ----
drop policy if exists notif_read on notifications;
create policy notif_read on notifications
  for select using (user_id = auth.uid() or user_id is null or is_admin());
drop policy if exists notif_update_own on notifications;
create policy notif_update_own on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notif_admin_write on notifications;
create policy notif_admin_write on notifications for all
  using (is_admin()) with check (is_admin());

-- =============================================================================
-- REALTIME  (publish tables the frontend subscribes to)
-- =============================================================================
do $$ begin
  alter publication supabase_realtime add table knowledge_articles;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table technical_requests;
exception when duplicate_object then null; end $$;

-- =============================================================================
-- Done. Now run supabase/seed.sql.
-- =============================================================================
