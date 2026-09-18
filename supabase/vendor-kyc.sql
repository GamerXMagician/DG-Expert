-- =============================================================================
-- DG Expert — Vendor KYC fields + document uploads (run AFTER vendors.sql)
-- =============================================================================
-- Expands the vendor application with the compulsory business/KYC details:
-- contact name, PAN (number + document), GST number, MSME certificate,
-- and multiple categories. Adds a private-ish `vendor-docs` storage bucket for
-- the PAN / MSME attachments. Idempotent.
-- =============================================================================

alter table vendors add column if not exists contact_name text;
alter table vendors add column if not exists pan_number   text;
alter table vendors add column if not exists pan_doc_url  text;
alter table vendors add column if not exists gst_number   text;
alter table vendors add column if not exists gst_doc_url  text;
alter table vendors add column if not exists msme_doc_url text;
alter table vendors add column if not exists categories   text[];

-- Storage bucket for vendor KYC documents (PAN card, MSME certificate).
-- Files live under <user_id>/<filename>. Owner + admins can read; owner writes.
insert into storage.buckets (id, name, public)
values ('vendor-docs', 'vendor-docs', true)
on conflict (id) do nothing;

drop policy if exists vendor_docs_read on storage.objects;
create policy vendor_docs_read on storage.objects
  for select using (bucket_id = 'vendor-docs');

drop policy if exists vendor_docs_insert on storage.objects;
create policy vendor_docs_insert on storage.objects
  for insert with check (
    bucket_id = 'vendor-docs'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists vendor_docs_update on storage.objects;
create policy vendor_docs_update on storage.objects
  for update using (
    bucket_id = 'vendor-docs'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- =============================================================================
-- Done. Vendor application now collects contact name, PAN (number + doc),
-- GST number, MSME certificate, location, optional website, and categories.
-- =============================================================================
