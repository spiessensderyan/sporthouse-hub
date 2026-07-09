import { google } from 'googleapis'
import { Readable } from 'stream'
import { createAdminClient } from '@/lib/supabase/server'

// Shared Drive-as-storage layer, used by every feature that stores files in
// Google Drive with only metadata in Supabase (Pré-Assist first, more to
// follow — see the platform-wide storage plan). One service account, one
// Shared Drive, one root folder; each feature gets its own subfolder via
// getOrCreateFolder/getOrCreateFolderPath rather than its own env var.
//
// Falls back to the original GOOGLE_PREASSIST_* env vars when the generic
// GOOGLE_DRIVE_* ones aren't set yet, so existing deployments keep working
// without a forced env var rename.

export interface DriveUploadedFile {
  id: string
  name: string
  mimeType: string
  size: string | null | undefined
  webViewLink: string
  webContentLink: string | null | undefined
  thumbnailLink: string | null | undefined
}

function serviceAccountEmail() {
  return process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL ?? process.env.GOOGLE_PREASSIST_SERVICE_ACCOUNT_EMAIL
}

function serviceAccountKey() {
  const key = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY ?? process.env.GOOGLE_PREASSIST_SERVICE_ACCOUNT_PRIVATE_KEY
  return key?.replace(/\\n/g, '\n')
}

export function driveRootFolderId() {
  return process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ?? process.env.GOOGLE_PREASSIST_DRIVE_FOLDER_ID
}

function getClient() {
  const email = serviceAccountEmail()
  const key   = serviceAccountKey()
  if (!email || !key) throw new Error('Google Drive niet geconfigureerd.')
  const auth = new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/drive'] })
  return google.drive({ version: 'v3', auth })
}

export function isDriveStorageConfigured() {
  return !!(serviceAccountEmail() && serviceAccountKey() && driveRootFolderId())
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (i < attempts) await new Promise(r => setTimeout(r, 500 * (i + 1)))
    }
  }
  throw lastErr
}

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  folderId: string
): Promise<DriveUploadedFile> {
  const drive = getClient()

  const file = await withRetry(() => drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: 'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink',
    supportsAllDrives: true,
  }))

  const fileId = file.data.id!

  try {
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    })
  } catch (err) {
    // Sharing failure shouldn't block the upload — file is still safely
    // stored, only the public webViewLink/thumbnailLink won't resolve.
    console.error('Drive storage: kon permissie niet instellen:', err)
  }

  return {
    id:             fileId,
    name:           file.data.name!,
    mimeType:       file.data.mimeType!,
    size:           file.data.size,
    webViewLink:    file.data.webViewLink!,
    webContentLink: file.data.webContentLink,
    thumbnailLink:  file.data.thumbnailLink,
  }
}

export async function updateFileContent(driveFileId: string, buffer: Buffer, mimeType: string) {
  const drive = getClient()
  await drive.files.update({
    fileId: driveFileId,
    media: { mimeType, body: Readable.from(buffer) },
    supportsAllDrives: true,
  })
}

export async function deleteFile(driveFileId: string) {
  const drive = getClient()
  await drive.files.delete({ fileId: driveFileId, supportsAllDrives: true })
}

export async function downloadFile(driveFileId: string) {
  const drive = getClient()
  const res = await drive.files.get(
    { fileId: driveFileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' }
  )
  return res.data as unknown as NodeJS.ReadableStream
}

// ─── Folder resolution ──────────────────────────────────────────────────────
//
// Mirrors an app-level folder hierarchy (edition/section/client, or a client's
// own file_folders tree) into real Drive subfolders, with a Supabase-backed
// cache so repeat uploads into the same folder don't re-list/re-create every
// time. The cache row itself is the lock: a fresh folder is first inserted as
// 'pending', so a second concurrent request for the same (parent, name) waits
// for the first to finish instead of racing it into creating a duplicate
// folder in Drive.

const PENDING = 'pending'

async function claimOrAwaitFolder(parentId: string, name: string): Promise<{ claimed: true; rowId: string } | { claimed: false; folderId: string }> {
  const admin = createAdminClient()

  const { data: claimed } = await admin
    .from('drive_folders')
    .upsert(
      { parent_drive_folder_id: parentId, name, drive_folder_id: PENDING },
      { onConflict: 'parent_drive_folder_id,name', ignoreDuplicates: true }
    )
    .select('id, drive_folder_id')
    .maybeSingle()

  if (claimed) return { claimed: true, rowId: claimed.id }

  // Someone else already owns (or is creating) this folder — read/poll until ready.
  for (let i = 0; i < 20; i++) {
    const { data: row } = await admin
      .from('drive_folders')
      .select('drive_folder_id')
      .eq('parent_drive_folder_id', parentId)
      .eq('name', name)
      .maybeSingle()
    if (row && row.drive_folder_id !== PENDING) return { claimed: false, folderId: row.drive_folder_id }
    await new Promise(r => setTimeout(r, 300))
  }
  throw new Error(`Timeout bij wachten op Drive-map "${name}".`)
}

export async function getOrCreateFolder(name: string, parentId: string): Promise<string> {
  const claim = await claimOrAwaitFolder(parentId, name)
  if (!claim.claimed) return claim.folderId

  const drive = getClient()
  const escaped = name.replace(/'/g, "\\'")
  const { data } = await drive.files.list({
    q: `name='${escaped}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: 'allDrives',
  })

  let folderId = data.files?.[0]?.id
  if (!folderId) {
    const folder = await drive.files.create({
      requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
      fields: 'id',
      supportsAllDrives: true,
    })
    folderId = folder.data.id!
  }

  const admin = createAdminClient()
  await admin.from('drive_folders').update({ drive_folder_id: folderId }).eq('id', claim.rowId)

  return folderId
}

export async function getOrCreateFolderPath(segments: string[], rootId: string): Promise<string> {
  let current = rootId
  for (const segment of segments) {
    current = await getOrCreateFolder(segment, current)
  }
  return current
}

export async function renameDriveFolder(driveFolderId: string, newName: string) {
  const drive = getClient()
  await drive.files.update({ fileId: driveFolderId, requestBody: { name: newName }, supportsAllDrives: true })
}

export async function deleteDriveFolder(driveFolderId: string) {
  const drive = getClient()
  await drive.files.delete({ fileId: driveFolderId, supportsAllDrives: true })
}
