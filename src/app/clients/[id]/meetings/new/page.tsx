import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import MeetingRecorder from '@/components/clients/MeetingRecorder'
import { ArrowLeft } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function NewMeetingPage({ params }: Props) {
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
      <div className="p-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <Link
            href={`/clients/${id}/meetings`}
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors mb-5"
          >
            <ArrowLeft size={12} />
            Terug naar vergaderingen
          </Link>
          <h2 className="text-base font-semibold text-sh-grey mb-1">Nieuwe vergadering</h2>
          <p className="text-sm text-zinc-500">
            Neem de vergadering op. De transcriptie wordt live getoond en daarna samengevat door AI.
          </p>
        </div>

        <MeetingRecorder clientId={id} clientName={client.name} />
      </div>
    </div>
  )
}
