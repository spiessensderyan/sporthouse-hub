-- Platform-wide Google Drive storage: cache table mapping (parent Drive
-- folder, name) -> Drive folder id, shared by every feature that mirrors an
-- app-level folder hierarchy into Drive (Pré-Assist editions/sections/clients,
-- client file_folders, etc). See src/lib/drive-storage.ts.
--
-- drive_folder_id temporarily holds the literal 'pending' while a folder is
-- being created in Drive — this row itself acts as the lock that prevents two
-- concurrent uploads from creating duplicate same-named folders in Drive.

create table if not exists drive_folders (
  id uuid primary key default gen_random_uuid(),
  parent_drive_folder_id text not null,
  name text not null,
  drive_folder_id text not null,
  created_at timestamptz default now(),
  unique (parent_drive_folder_id, name)
);

-- Internal cache, only ever touched by the service-role admin client
-- (src/lib/drive-storage.ts) — no anon/authenticated access needed.
alter table drive_folders enable row level security;

create policy "Service role full access drive_folders"
  on drive_folders for all to service_role using (true);
