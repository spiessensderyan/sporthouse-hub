import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ADMIN_EMAILS } from '@/lib/auth-permissions'
import { isSporthouseDriveConfigured, uploadFile, getOrCreateFolderPath, sporthouseRootFolderId, deleteFile } from '@/lib/drive-storage'

export const maxDuration = 60

function permKey(section: string) {
  return section === 'finance' ? 'financien' : 'administratie'
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const section = new URL(req.url).searchParams.get('section')
  if (!section) return new Response('Missing section', { status: 400 })

  const sections: string[] = user.app_metadata?.permissions?.sections ?? []
  const isAdmin = ADMIN_EMAILS.includes(user.email ?? '') || sections.includes('beheer')
  const pk = permKey(section)
  if (!isAdmin && !sections.includes(`${pk}_bekijken`) && !sections.includes(`${pk}_beheren`)) {
    return new Response('Forbidden', { status: 403 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('sporthouse_documents')
    .select('*')
    .eq('section', section)
    .order('created_at', { ascending: false })

  if (error) return new Response(error.message, { status: 500 })
  return Response.json(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const formData = await req.formData()
  const section = formData.get('section') as string | null
  const description = formData.get('description') as string | null
  const file = formData.get('file') as File | null

  if (!section || !file) return new Response('Missing section or file', { status: 400 })

  const sections: string[] = user.app_metadata?.permissions?.sections ?? []
  const isAdmin = ADMIN_EMAILS.includes(user.email ?? '') || sections.includes('beheer')
  const pk = permKey(section)
  if (!isAdmin && !sections.includes(`${pk}_beheren`)) {
    return new Response('Forbidden', { status: 403 })
  }

  if (!isSporthouseDriveConfigured()) {
    return new Response('Google Drive is niet geconfigureerd.', { status: 503 })
  }

  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : ''
  const buffer = Buffer.from(await file.arrayBuffer())

  let driveFile
  try {
    const folderId = await getOrCreateFolderPath([section], sporthouseRootFolderId()!)
    driveFile = await uploadFile(buffer, file.name, file.type || 'application/octet-stream', folderId, { public: false })
  } catch (err) {
    console.error('Drive upload error:', err)
    return new Response('Upload naar Drive mislukt.', { status: 500 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('sporthouse_documents')
    .insert({
      section,
      filename: file.name,
      description: description?.trim() || null,
      file_type: ext,
      file_size: file.size,
      storage_provider: 'drive',
      drive_file_id: driveFile.id,
      uploaded_by: user.email,
    })
    .select()
    .single()

  if (error) {
    console.error('DB insert error:', error)
    try { await deleteFile(driveFile.id) } catch { /* best effort cleanup */ }
    return new Response(error.message, { status: 500 })
  }

  return Response.json(data, { status: 201 })
}
