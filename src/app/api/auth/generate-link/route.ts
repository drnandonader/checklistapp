import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  const email = searchParams.get('email')

  if (secret !== 'tmplink2026') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  if (!email) {
    return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://checklistapp-ten.vercel.app'

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${appUrl}/auth/callback` },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ link: data.properties?.action_link })
}
