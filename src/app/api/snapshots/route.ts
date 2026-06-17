import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { DEFAULT_UBS_ID } from '@/lib/supabaseAdmin'
import { getItemsByProfessional } from '@/data/checklist'
import { ProfessionalCategory } from '@/types'

const ALL_PROFESSIONALS: ProfessionalCategory[] = ['medico', 'enfermeira', 'tecnico', 'acs']

// GET /api/snapshots?months=6  -> retorna os últimos N meses de histórico
export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('months')) || 6

  const { data, error } = await supabase
    .from('monthly_snapshots')
    .select('*')
    .eq('ubs_id', DEFAULT_UBS_ID)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(limit * ALL_PROFESSIONALS.length)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ snapshots: data })
}

// POST /api/snapshots — "fecha" o mês: calcula e grava o snapshot
// para todas as categorias profissionais. RLS restringe esta
// operação à coordenação.
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { month, year } = await req.json()
    if (!month || !year) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    const results = []

    for (const professional of ALL_PROFESSIONALS) {
      const items = getItemsByProfessional(professional)
      const totalItems = items.length

      const { data: entries } = await supabase
        .from('checklist_entries')
        .select('status')
        .eq('ubs_id', DEFAULT_UBS_ID)
        .eq('professional', professional)
        .eq('month', month)
        .eq('year', year)

      const done = (entries || []).filter((e) => e.status === 'concluido').length
      const inProgress = (entries || []).filter((e) => e.status === 'em_andamento').length
      const percent = totalItems > 0 ? Math.round((done / totalItems) * 100) : 0

      const { error } = await supabase.from('monthly_snapshots').upsert(
        {
          ubs_id: DEFAULT_UBS_ID,
          professional,
          month,
          year,
          total_items: totalItems,
          done,
          in_progress: inProgress,
          percent,
        },
        { onConflict: 'ubs_id,professional,month,year' }
      )

      if (error) {
        return NextResponse.json(
          { error: `Sem permissão para fechar o mês (apenas coordenação): ${error.message}` },
          { status: 403 }
        )
      }

      results.push({ professional, percent, done, totalItems })
    }

    return NextResponse.json({ success: true, results })
  } catch (err) {
    console.error('[snapshots POST]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
