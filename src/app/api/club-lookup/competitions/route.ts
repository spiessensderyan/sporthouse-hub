import { createClient, createAdminClient } from '@/lib/supabase/server'

const ADMIN_EMAILS = ['arne.smets@sporthousegroup.com', 'deryan.spiessens@sporthousegroup.com']

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const sections: string[] = user.user_metadata?.permissions?.sections ?? []
  return ADMIN_EMAILS.includes(user.email ?? '') || sections.includes('beheer') ? user : null
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId')
  if (!clientId) return new Response('clientId required', { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('club_lookup_competitions')
    .select('id, name, country, sofascore_tournament_id, sofascore_season_id')
    .eq('client_id', clientId)
    .order('name')

  if (error) return new Response(error.message, { status: 500 })
  return Response.json(data ?? [])
}

export async function POST(req: Request) {
  const user = await requireAdmin()
  if (!user) return new Response('Forbidden', { status: 403 })

  const { clientId, name, country, sofascore_tournament_id, sofascore_season_id } = await req.json()
  if (!clientId || !name || !sofascore_tournament_id || !sofascore_season_id) {
    return new Response('Verplichte velden ontbreken', { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('club_lookup_competitions')
    .insert({ client_id: clientId, name: name.trim(), country: (country ?? '').trim(), sofascore_tournament_id: sofascore_tournament_id.trim(), sofascore_season_id: sofascore_season_id.trim() })
    .select()
    .single()

  if (error) return new Response(error.message, { status: 500 })
  return Response.json(data)
}

export async function DELETE(req: Request) {
  const user = await requireAdmin()
  if (!user) return new Response('Forbidden', { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return new Response('id required', { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('club_lookup_competitions').delete().eq('id', id)
  if (error) return new Response(error.message, { status: 500 })
  return Response.json({ ok: true })
}
