import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')
  const end   = searchParams.get('end')
  if (!start || !end) return new Response('start and end required', { status: 400 })

  const { data, error } = await supabase
    .from('day_projects')
    .select('*')
    .gte('date', start)
    .lte('date', end)

  if (error) return new Response(error.message, { status: 500 })
  return Response.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { date, project_name } = await req.json()
  if (!date) return new Response('date required', { status: 400 })

  // Upsert: update if exists, insert if not
  const { data, error } = await supabase
    .from('day_projects')
    .upsert({ date, project_name: project_name ?? '' }, { onConflict: 'date' })
    .select()
    .single()

  if (error) return new Response(error.message, { status: 500 })
  return Response.json(data)
}
