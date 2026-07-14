-- Soft-delete for files: deleting a file moves it to Drive's own trash
-- (files.update({trashed:true})) and marks the row here instead of removing
-- it outright, so it can be restored from the app's "Prullenbak" view.
-- A daily cron (src/app/api/cron/purge-trash/route.ts) permanently purges
-- anything trashed for 30+ days, mirroring Google Drive's own retention.

alter table files
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by text;

create index if not exists files_deleted_at_idx on files (deleted_at);
