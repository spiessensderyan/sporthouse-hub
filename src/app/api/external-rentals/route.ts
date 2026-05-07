import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = new URL(req.url)
  const year  = searchParams.get('year')
  const month = searchParams.get('month')

  let query = supabase
    .from('external_rentals')
    .select('*')
    .order('start_date', { ascending: false })

  if (year && month) {
    const pad   = (n: string) => n.padStart(2, '0')
    const start = `${year}-${pad(month)}-01`
    const end   = new Date(Number(year), Number(month), 0).toISOString().slice(0, 10)
    query = query.gte('start_date', start).lte('start_date', end)
  } else if (year) {
    query = query.gte('start_date', `${year}-01-01`).lte('start_date', `${year}-12-31`)
  }

  const { data, error } = await query
  if (error) return new Response(error.message, { status: 500 })
  return Response.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const body = await req.json()
  const { item_name, supplier, start_date, end_date, total_cost, project, note } = body

  if (!item_name || !start_date || !end_date) {
    return new Response('Missing required fields', { status: 400 })
  }

  const { data, error } = await supabase
    .from('external_rentals')
    .insert({
      item_name,
      supplier:   supplier?.trim()    || null,
      start_date,
      end_date,
      total_cost: total_cost != null && total_cost !== '' ? Number(total_cost) : null,
      project:    project?.trim()     || null,
      note:       note?.trim()        || null,
    })
    .select()
    .single()

  if (error) return new Response(error.message, { status: 500 })
  return Response.json(data, { status: 201 })
}
