import { createClient } from '@/lib/supabase/server'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Referer': 'https://www.sofascore.com/',
}

async function getLatestSeasonId(tournamentId: number): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.sofascore.com/api/v1/unique-tournament/${tournamentId}/seasons`,
      { headers: HEADERS, next: { revalidate: 0 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const seasons: { id: number; year: string }[] = data?.seasons ?? []
    return seasons.length ? seasons[0].id : null
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) return Response.json([])

  const res = await fetch(
    `https://api.sofascore.com/api/v1/search/all?q=${encodeURIComponent(q)}`,
    { headers: HEADERS, next: { revalidate: 0 } }
  )

  if (!res.ok) return Response.json([])

  const data = await res.json()
  const tournaments: { id: number; name: string; category?: { name: string; country?: { name: string } } }[] =
    data?.uniqueTournaments ?? []

  const results = tournaments.slice(0, 8).map(t => ({
    id: t.id,
    name: t.name,
    country: t.category?.country?.name ?? t.category?.name ?? '',
  }))

  const withSeasons = await Promise.all(
    results.map(async t => ({
      ...t,
      latestSeasonId: await getLatestSeasonId(t.id),
    }))
  )

  return Response.json(withSeasons.filter(t => t.latestSeasonId !== null))
}
