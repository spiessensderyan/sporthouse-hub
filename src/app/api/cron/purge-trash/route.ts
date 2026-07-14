import { createAdminClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { deleteFile } from '@/lib/drive-storage'

// Mirrors Google Drive's own trash retention: anything soft-deleted in the
// app for 30+ days gets permanently purged (Drive file + DB row), whether or
// not anyone opened the Prullenbak to look at it.
export async function GET() {
  const headersList = await headers()
  const auth = headersList.get('authorization')

  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const admin = createAdminClient()

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: expired, error } = await admin
    .from('files')
    .select('id, storage_provider, storage_path, drive_file_id')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff)

  if (error) return new Response(error.message, { status: 500 })

  const results = await Promise.allSettled(
    (expired ?? []).map(async (file) => {
      if (file.storage_provider === 'drive' && file.drive_file_id) {
        try { await deleteFile(file.drive_file_id) } catch { /* may already be gone */ }
      } else if (file.storage_path) {
        await admin.storage.from('files').remove([file.storage_path])
      }
      const { error: delErr } = await admin.from('files').delete().eq('id', file.id)
      if (delErr) throw delErr
    })
  )

  const purged = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return Response.json({ checked: expired?.length ?? 0, purged, failed })
}
