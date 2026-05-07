import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { postId } = await params
  const { title, copy, platform, status, scheduled_date } = await request.json()

  const { data, error } = await supabase
    .from('content_posts')
    .update({
      title: title?.trim(),
      copy: copy || null,
      platform: platform || null,
      status,
      scheduled_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .select()
    .single()

  if (error) return new Response(error.message, { status: 500 })
  return Response.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { postId } = await params
  const { error } = await supabase.from('content_posts').delete().eq('id', postId)
  if (error) return new Response(error.message, { status: 500 })
  return new Response(null, { status: 204 })
}
