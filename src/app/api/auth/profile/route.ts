import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST() {
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id, name, email, professional')
    .eq('id', user.id)
    .maybeSingle()

  if (existingProfile) {
    return NextResponse.json(existingProfile)
  }

  const normalizedEmail = user.email.trim().toLowerCase()
  const { data: pendingMember, error: pendingError } = await admin
    .from('pending_team_members')
    .select('ubs_id, name, email, professional')
    .ilike('email', normalizedEmail)
    .maybeSingle()

  if (pendingError || !pendingMember) {
    return NextResponse.json(
      { error: 'E-mail não cadastrado pela coordenação' },
      { status: 403 }
    )
  }

  const { data: profile, error: insertError } = await admin
    .from('profiles')
    .upsert({
      id: user.id,
      ubs_id: pendingMember.ubs_id,
      name: pendingMember.name,
      email: normalizedEmail,
      professional: pendingMember.professional,
      active: true,
    }, { onConflict: 'id' })
    .select('id, name, email, professional')
    .single()

  if (insertError) {
    return NextResponse.json({ error: 'Não foi possível criar o perfil' }, { status: 500 })
  }

  return NextResponse.json(profile)
}
