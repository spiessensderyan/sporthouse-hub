import { createClient, createAdminClient } from '@/lib/supabase/server'

const ADMIN_EMAILS = ['arne.smets@sporthousegroup.com', 'deryan.spiessens@sporthousegroup.com']

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const sections: string[] = user.user_metadata?.permissions?.sections ?? []
  return ADMIN_EMAILS.includes(user.email ?? '') || sections.includes('beheer') ? user : null
}

interface SofascoreTeam {
  id: number
  name: string
  shortName: string
}

async function fetchTeamsForCompetition(tournamentId: string, seasonId: string): Promise<SofascoreTeam[]> {
  const url = `https://api.sofascore.com/api/v1/unique-tournament/${tournamentId}/season/${seasonId}/standings/total`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Referer': 'https://www.sofascore.com/',
    },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`Sofascore HTTP ${res.status} voor tournament ${tournamentId}`)
  const data = await res.json()

  const teams: SofascoreTeam[] = []
  const standings = data?.standings ?? []
  for (const group of standings) {
    for (const row of group?.rows ?? []) {
      const t = row?.team
      if (t?.id && t?.name) {
        teams.push({ id: t.id, name: t.name, shortName: t.shortName ?? t.name })
      }
    }
  }
  return teams
}

export async function POST(req: Request) {
  const user = await requireAdmin()
  if (!user) return new Response('Forbidden', { status: 403 })

  const { clientId } = await req.json()
  if (!clientId) return new Response('clientId required', { status: 400 })

  const admin = createAdminClient()

  const [{ data: competitions }, { data: existingClubs }] = await Promise.all([
    admin.from('club_lookup_competitions').select('*').eq('client_id', clientId),
    admin.from('club_lookup_clubs').select('*').eq('client_id', clientId),
  ])

  if (!competitions?.length) {
    return Response.json({ error: 'Geen competities geconfigureerd.' }, { status: 400 })
  }

  // Fetch all teams from Sofascore per competition
  const fetchedByComp: { competition: string; country: string; teams: SofascoreTeam[] }[] = []
  const errors: string[] = []

  for (const comp of competitions) {
    try {
      const teams = await fetchTeamsForCompetition(comp.sofascore_tournament_id, comp.sofascore_season_id)
      fetchedByComp.push({ competition: comp.name, country: comp.country, teams })
    } catch (e) {
      errors.push(`${comp.name}: ${e instanceof Error ? e.message : 'onbekende fout'}`)
    }
  }

  const existing = existingClubs ?? []

  // Build diff
  const newClubs: { sofascore_id: string; full_name: string; short_name: string; competition: string; country: string }[] = []
  const changedClubs: { id: string; full_name: string; short_name: string; old_competition: string; new_competition: string }[] = []
  const removedClubs: { id: string; full_name: string; short_name: string; competition: string }[] = []

  // Track which existing clubs were seen in the refresh
  const seenIds = new Set<string>()

  for (const { competition, country, teams } of fetchedByComp) {
    for (const team of teams) {
      const sofascoreId = String(team.id)
      const existingById = existing.find(c => c.sofascore_id === sofascoreId)
      const existingByName = existing.find(c => c.full_name.toLowerCase() === team.name.toLowerCase())
      const match = existingById ?? existingByName

      if (match) {
        seenIds.add(match.id)
        if (match.competition !== competition) {
          changedClubs.push({
            id: match.id,
            full_name: match.full_name,
            short_name: match.short_name,
            old_competition: match.competition,
            new_competition: competition,
          })
        }
      } else {
        newClubs.push({
          sofascore_id: sofascoreId,
          full_name: team.name,
          short_name: team.shortName,
          competition,
          country,
        })
      }
    }
  }

  // Clubs in DB that belong to a tracked competition but weren't seen → possibly relegated
  const trackedCompetitions = new Set(fetchedByComp.map(f => f.competition))
  for (const club of existing) {
    if (trackedCompetitions.has(club.competition) && !seenIds.has(club.id)) {
      removedClubs.push({
        id: club.id,
        full_name: club.full_name,
        short_name: club.short_name,
        competition: club.competition,
      })
    }
  }

  return Response.json({ new: newClubs, changed: changedClubs, removed: removedClubs, errors })
}
