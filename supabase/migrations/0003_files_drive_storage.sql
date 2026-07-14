-- Klantbestanden (files) naar Google Drive, met echte, gesynchroniseerde
-- mappen (file_folders.drive_folder_id, lui aangemaakt bij de eerste upload
-- in een map — zie resolveDriveFolderId in src/app/api/files/route.ts).

alter table files
  add column if not exists storage_provider text,
  add column if not exists drive_file_id text,
  add column if not exists web_view_link text,
  add column if not exists web_content_link text,
  add column if not exists thumbnail_link text;

update files set storage_provider = 'supabase' where storage_provider is null;

alter table files
  alter column storage_provider set default 'drive',
  alter column storage_provider set not null,
  alter column storage_path drop not null;

alter table file_folders
  add column if not exists drive_folder_id text;
