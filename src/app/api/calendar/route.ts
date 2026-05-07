import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  const year = searchParams.get('year')
  const month = searchParams.get('month')

  if (!clientId) return new Response('Missing clientId', { status: 400 })

  let query = supabase
    .from('content_posts')
    .select('*')
    .eq('client_id', clientId)
    .order('scheduled_date', { ascending: true })

  if (year && month) {
    const y = Number(year)
    const m = Number(month)
    const start = `${y}-${String(m).padStart(2, '0')}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    query = query.gte('scheduled_date', start).lte('scheduled_date', end)
  }

  const { data, error } = await query
  if (error) return new Response(error.message, { status: 500 })
  return Response.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { clientId, title, copy, platform, status, scheduledDate } = await request.json()
  if (!clientId || !title || !scheduledDate) return new Response('Missing required fields', { status: 400 })

  const { data, error } = await supabase
    .from('content_posts')
    .insert({
      client_id: clientId,
      title: title.trim(),
      copy: copy || null,
      platform: platform || null,
      status: status || 'concept',
      scheduled_date: scheduledDate,
      created_by: user.email,
    })
    .select()
    .single()

  if (error) return new Response(error.message, { status: 500 })
  return Response.json(data)
}
