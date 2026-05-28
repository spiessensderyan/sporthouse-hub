import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ADMIN_EMAILS = ['arne.smets@sporthousegroup.com', 'deryan.spiessens@sporthousegroup.com']

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const supabase = await createClient()
  const { error: exchError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchError) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  // Check authorization for the main app
  const sections: string[] = user.user_metadata?.permissions?.sections ?? []
  const isAdmin = ADMIN_EMAILS.includes(user.email ?? '') || sections.includes('beheer')
  const isAllowed = isAdmin || user.user_metadata?.allowed === true

  if (isAllowed) {
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // Check if user is a freelancer
  const admin = createAdminClient()
  const { data: freelancer } = await admin
    .from('freelancers')
    .select('id')
    .eq('email', user.email ?? '')
    .maybeSingle()

  if (freelancer) {
    return NextResponse.redirect(`${origin}/portal`)
  }

  // Not authorized — immediately delete and sign out, nothing is stored
  await admin.auth.admin.deleteUser(user.id)
  await supabase.auth.signOut()

  return NextResponse.redirect(`${origin}/login?error=unauthorized`)
}
