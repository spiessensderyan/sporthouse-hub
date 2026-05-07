import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const like = `%${query}%`

  const [clients, files, meetings, documents, projects] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, description, color, category')
      .or(`name.ilike.${like},description.ilike.${like}`)
      .limit(5),

    supabase
      .from('files')
      .select('id, filename, description, client_id')
      .or(`filename.ilike.${like},description.ilike.${like}`)
      .limit(5),

    supabase
      .from('meetings')
      .select('id, title, client_id, created_at')
      .ilike('title', like)
      .limit(5),

    supabase
      .from('expert_documents')
      .select('id, title, client_id')
      .ilike('title', like)
      .limit(5),

    supabase
      .from('projects')
      .select('id, name, description, status')
      .or(`name.ilike.${like},description.ilike.${like}`)
      .limit(5),
  ])

  return NextResponse.json({
    results: {
      clients:   clients.data   || [],
      files:     files.data     || [],
      meetings:  meetings.data  || [],
      documents: documents.data || [],
      projects:  projects.data  || [],
    },
  })
}
