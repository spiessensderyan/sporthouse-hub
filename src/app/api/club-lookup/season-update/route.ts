import { createClient, createAdminClient } from '@/lib/supabase/server'

const ADMIN_EMAILS = ['arne.smets@sporthousegroup.com', 'deryan.spiessens@sporthousegroup.com']

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const sections: string[] = user.user_metadata?.permissions?.sections ?? []
  return ADMIN_EMAILS.includes(user.email ?? '') || sections.includes('beheer') ? user : null
}

interface ClubChange {
  clubId: string
  newCompetition: string
}

export async function POST(req: Request) {
  const user = await requireAdmin()
  if (!user) return new Response('Forbidden', { status: 403 })

  const { clientId, changes }: { clientId: string; changes: ClubChange[] } = await req.json()
  if (!clientId || !Array.isArray(changes)) return new Response('Bad request', { status: 400 })
  if (changes.length === 0) return Response.json({ updated: 0 })

  const admin = createAdminClient()
  const now = new Date().toISOString()
  let updated = 0

  for (const { clubId, newCompetition } of changes) {
    const { error } = await admin
      .from('club_lookup_clubs')
      .update({ competition: newCompetition, updated_at: now })
      .eq('id', clubId)
      .eq('client_id', clientId)

    if (!error) updated++
  }

  return Response.json({ updated })
}
