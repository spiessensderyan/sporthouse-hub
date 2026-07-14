import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import FileManager from '@/components/clients/FileManager'

const ADMIN_EMAILS = ['arne.smets@sporthousegroup.com', 'deryan.spiessens@sporthousegroup.com']

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

  const permsObj = user?.user_metadata?.permissions ?? null
  const sections: string[] = permsObj?.sections ?? []
  const isAdmin = ADMIN_EMAILS.includes(user?.email ?? '') || sections.includes('beheer')
  const canDeleteFiles = isAdmin || permsObj === null || sections.includes('bestanden_verwijderen')

  return (
    <div className="h-full overflow-y-auto">
      <FileManager clientId={id} currentUserEmail={user?.email ?? null}
        isAdmin={isAdmin} canDeleteFiles={canDeleteFiles} />
    </div>
  )
}
