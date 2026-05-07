import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; projectId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { id, projectId } = await params
  const admin = createAdminClient()

  const { error } = await admin.from('freelancer_projects').delete().eq('id', projectId)
  if (error) return new Response(error.message, { status: 500 })

  // Recalculate rating after deletion
  const { data: allProjects } = await admin
    .from('freelancer_projects')
    .select('score')
    .eq('freelancer_id', id)

  const scores = (allProjects ?? [])
    .map(p => p.score)
    .filter((s): s is number => s != null && s >= 1 && s <= 5)

  const newRating = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null

  await admin.from('freelancers').update({ rating: newRating }).eq('id', id)

  return Response.json({ new_freelancer_rating: newRating }, { status: 200 })
}
