-- Pré-assist: Google Drive as storage backend, alongside existing Supabase
-- Storage rows. Run this once in the Supabase SQL editor before testing
-- uploads. Purely additive/reversible: existing rows keep working with
-- storage_provider = 'supabase', new uploads get storage_provider = 'drive'.

alter table preassist_submissions
  add column if not exists storage_provider text,
  add column if not exists drive_file_id text,
  add column if not exists web_view_link text,
  add column if not exists web_content_link text,
  add column if not exists thumbnail_link text;

update preassist_submissions set storage_provider = 'supabase' where storage_provider is null;

alter table preassist_submissions
  alter column storage_provider set default 'drive',
  alter column storage_provider set not null,
  alter column file_url drop not null;
