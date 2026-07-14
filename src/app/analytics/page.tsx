import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'
import { ADMIN_EMAILS } from '@/lib/auth-permissions'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    redirect('/dashboard')
  }

  return <AnalyticsDashboard />
}
