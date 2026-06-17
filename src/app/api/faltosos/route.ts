import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { DEFAULT_UBS_ID } from '@/lib/supabaseAdmin'

// GET /api/faltosos?month=6&year=2026&condicao=hipertensao (condicao opcional)
export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = Number(searchParams.get('month'))
  const year = Number(searchParams.get('year'))
  const condicao = searchParams.get('condicao')

  if (!month || !year) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  let query = supabase
    .from('faltosos')
    .select('*')
    .eq('ubs_id', DEFAULT_UBS_ID)
    .eq('month', month)
    .eq('year', year)
    .order('dias_em_atraso', { ascending: false })

  if (condicao) query = query.eq('condicao', condicao)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ faltosos: data })
}

// PATCH /api/faltosos — marcar como resolvido (qualquer profissional pode)
export async function PATCH(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id, resolvido, observacao } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (resolvido !== undefined) updates.resolvido = resolvido
  if (observacao !== undefined) updates.observacao = observacao

  const { error } = await supabase.from('faltosos').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
