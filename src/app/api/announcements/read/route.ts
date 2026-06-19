import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { announcement_id } = await req.json()
    if (!announcement_id) {
      return NextResponse.json({ error: 'announcement_id é obrigatório' }, { status: 400 })
    }

    const { error } = await supabase
      .from('announcement_reads')
      .upsert(
        { announcement_id, profile_id: user.id },
        { onConflict: 'announcement_id,profile_id' }
      )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[announcement-read POST]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
