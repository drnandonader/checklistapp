import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')?.trim().toLowerCase()
  const origin = req.nextUrl.origin

  const failUrl = new URL('/login', origin)
  failUrl.searchParams.set('error', 'auto_login_failed')

  if (!email || !email.includes('@')) {
    return NextResponse.redirect(failUrl)
  }

  const admin = getSupabaseAdmin()

  const { data: profile } = await admin
    .from('profiles')
    .select('email')
    .ilike('email', email)
    .eq('active', true)
    .maybeSingle()

  if (!profile) {
    return NextResponse.redirect(failUrl)
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || origin).replace(/\/$/, '')

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: profile.email,
    options: { redirectTo: `${appUrl}/auth/callback` },
  })

  const actionLink = data?.properties?.action_link
  if (error || !actionLink) {
    return NextResponse.redirect(failUrl)
  }

  return NextResponse.redirect(actionLink)
}
