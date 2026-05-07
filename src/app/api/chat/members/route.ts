import { createClient, createAdminClient } from '@/lib/supabase/server'

// Returns all contacts that have an email, for avatar lookup in chat
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('contacts')
    .select('email, photo_url, name')
    .not('email', 'is', null)

  if (error) return new Response(error.message, { status: 500 })
  return Response.json(data ?? [])
}
