import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin
    .from('chat_messages')
    .delete()
    .eq('id', id)
    .eq('created_by', user.email ?? '')

  if (error) return new Response(error.message, { status: 500 })
  return new Response(null, { status: 204 })
}
