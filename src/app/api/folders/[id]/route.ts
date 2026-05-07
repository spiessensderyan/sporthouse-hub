import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { id } = await params
  const { name } = await req.json()
  if (!name?.trim()) return new Response('name required', { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('file_folders')
    .update({ name: name.trim() })
    .eq('id', id)
    .select()
    .single()

  if (error) return new Response(error.message, { status: 500 })
  return Response.json(data)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  // Move files in this folder to parent (set folder_id = null / parent)
  // Then delete folder — subfolders cascade due to ON DELETE CASCADE
  const { error } = await admin.from('file_folders').delete().eq('id', id)
  if (error) return new Response(error.message, { status: 500 })
  return new Response(null, { status: 204 })
}
