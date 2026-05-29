import { createClient, createAdminClient } from '@/lib/supabase/server'

const ADMIN_EMAILS = ['arne.smets@sporthousegroup.com', 'deryan.spiessens@sporthousegroup.com']

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const sections: string[] = user.user_metadata?.permissions?.sections ?? []
  return ADMIN_EMAILS.includes(user.email ?? '') || sections.includes('beheer') ? user : null
}

interface NewClub {
  sofascore_id: string
  full_name: string
  short_name: string
  competition: string
  country: string
}

interface ChangedClub {
  id: string
  new_competition: string
}

interface RemovedClub {
  id: string
}

export async function POST(req: Request) {
  const user = await requireAdmin()
  if (!user) return new Response('Forbidden', { status: 403 })

  const {
    clientId,
    newClubs,
    changedClubs,
    removedClubs,
  }: {
    clientId: string
    newClubs: NewClub[]
    changedClubs: ChangedClub[]
    removedClubs: RemovedClub[]
  } = await req.json()

  if (!clientId) return new Response('clientId required', { status: 400 })

  const admin = createAdminClient()
  const now = new Date().toISOString()

  // Insert new clubs (needs_name = true if short_name is same as full_name — likely Sofascore default)
  if (newClubs?.length) {
    await admin.from('club_lookup_clubs').insert(
      newClubs.map(c => ({
        client_id: clientId,
        full_name: c.full_name,
        short_name: c.short_name,
        competition: c.competition,
        country: c.country,
        sofascore_id: c.sofascore_id,
        needs_name: true,
        updated_at: now,
      }))
    )
  }

  // Update competition for changed clubs
  for (const c of changedClubs ?? []) {
    await admin
      .from('club_lookup_clubs')
      .update({ competition: c.new_competition, updated_at: now })
      .eq('id', c.id)
  }

  // Delete removed clubs
  for (const c of removedClubs ?? []) {
    await admin.from('club_lookup_clubs').delete().eq('id', c.id)
  }

  return Response.json({ ok: true })
}
