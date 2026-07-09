import { google } from 'googleapis'
import { Readable } from 'stream'

// Dedicated service account for the Pré-Assist Google Drive storage test —
// deliberately separate from src/lib/google-drive.ts (different Google Cloud
// project, different Shared Drive), so this feature can't affect the existing
// client-document Drive integration.

export interface PreassistDriveFile {
  id: string
  name: string
  mimeType: string
  size: string | null | undefined
  webViewLink: string
  webContentLink: string | null | undefined
  thumbnailLink: string | null | undefined
}

function getClient() {
  const email = process.env.GOOGLE_PREASSIST_SERVICE_ACCOUNT_EMAIL
  const key   = process.env.GOOGLE_PREASSIST_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!email || !key) throw new Error('Google Drive (Pré-assist) niet geconfigureerd.')
  const auth = new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/drive'] })
  return google.drive({ version: 'v3', auth })
}

export function isPreassistDriveConfigured() {
  return !!(
    process.env.GOOGLE_PREASSIST_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PREASSIST_SERVICE_ACCOUNT_PRIVATE_KEY &&
    process.env.GOOGLE_PREASSIST_DRIVE_FOLDER_ID
  )
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

export async function uploadPreassistFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  folderId: string
): Promise<PreassistDriveFile> {
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
    console.error('Pré-assist Drive: kon permissie niet instellen:', err)
  }

  return {
    id:              fileId,
    name:            file.data.name!,
    mimeType:        file.data.mimeType!,
    size:            file.data.size,
    webViewLink:     file.data.webViewLink!,
    webContentLink:  file.data.webContentLink,
    thumbnailLink:   file.data.thumbnailLink,
  }
}

export async function deletePreassistDriveFile(driveFileId: string) {
  const drive = getClient()
  await drive.files.delete({ fileId: driveFileId, supportsAllDrives: true })
}

export async function downloadPreassistFile(driveFileId: string) {
  const drive = getClient()
  const res = await drive.files.get(
    { fileId: driveFileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' }
  )
  return res.data as unknown as NodeJS.ReadableStream
}
