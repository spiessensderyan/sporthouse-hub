import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import FileManager from '@/components/clients/FileManager'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClientFilesPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', id)
    .single()

  if (!client) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="h-full overflow-y-auto">
      <FileManager clientId={id} currentUserEmail={user?.email ?? null} />
    </div>
  )
}
