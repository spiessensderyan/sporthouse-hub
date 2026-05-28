import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'


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

  // Freelancers go to /portal
  const isFreelancer = user.user_metadata?.freelancer === true
  if (isFreelancer) {
    return NextResponse.redirect(`${origin}/portal`)
  }

  const admin = createAdminClient()
  const { data: freelancerRow } = await admin
    .from('freelancers')
    .select('id')
    .eq('email', user.email ?? '')
    .maybeSingle()

  if (freelancerRow) {
    return NextResponse.redirect(`${origin}/portal`)
  }

  // Everyone else goes to dashboard — Supabase's "disable signups" ensures
  // only pre-created accounts can reach this point
  return NextResponse.redirect(`${origin}/dashboard`)
}
