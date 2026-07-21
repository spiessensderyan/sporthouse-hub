-- Drive-opslag voor sporthouse_documents (Financiën/Administratie), in een
-- eigen geïsoleerde Shared Drive — geen sharePublicly, dus geen
-- web_view_link/thumbnail_link nodig zoals bij de andere Drive-migraties;
-- alle toegang loopt via onze eigen, permissie-gecontroleerde route.
alter table sporthouse_documents
  add column if not exists storage_provider text default 'supabase',
  add column if not exists drive_file_id text;

-- storage_path werd altijd ingevuld toen alleen Supabase Storage bestond —
-- Drive-rijen hebben geen storage-pad, dus die kolom moet nullable zijn.
-- Idempotent: no-op als hij al nullable is.
alter table sporthouse_documents
  alter column storage_path drop not null;
