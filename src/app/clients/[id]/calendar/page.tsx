import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ContentCalendar from '@/components/calendar/ContentCalendar'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CalendarPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!client) notFound()

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-base font-semibold text-white mb-1">Content Kalender</h2>
          <p className="text-sm text-zinc-500">
            Plan en beheer social media posts voor {client.name}.
          </p>
        </div>

        <ContentCalendar clientId={id} />
      </div>
    </div>
  )
}
