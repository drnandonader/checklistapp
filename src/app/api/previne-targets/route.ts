import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { DEFAULT_UBS_ID } from '@/lib/supabaseAdmin'

// GET /api/previne-targets — lista as metas vigentes dos 7 indicadores
// Leitura liberada para todos autenticados (RLS garante isso).
export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabase
    .from('previne_indicator_targets')
    .select('*')
    .eq('ubs_id', DEFAULT_UBS_ID)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ targets: data || [] })
}

// PUT /api/previne-targets — atualiza a meta de um indicador
// Body: { id, target_percent, quadrimestre }
// RLS restringe insert/update à coordenação.
export async function PUT(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { id, target_percent, quadrimestre } = await req.json()
    if (!id || target_percent == null) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    const { error } = await supabase.from('previne_indicator_targets').upsert(
      {
        id,
        ubs_id: DEFAULT_UBS_ID,
        target_percent,
        quadrimestre: quadrimestre || '',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

    if (error) {
      return NextResponse.json(
        { error: `Sem permissão para editar metas (apenas coordenação): ${error.message}` },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[previne-targets PUT]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
