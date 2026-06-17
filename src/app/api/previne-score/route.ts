import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin, DEFAULT_UBS_ID } from '@/lib/supabaseAdmin'
import { computePrevineScores } from '@/data/checklist'
import { ChecklistEntry, PrevineIndicatorTarget } from '@/types'

// GET /api/previne-score?month=6&year=2026
// Retorna o placar dos 7 indicadores como ESTIMATIVA INTERNA DE PROCESSO,
// calculada a partir das ações do checklist marcadas como concluídas —
// não é o número oficial do SISAB. Qualquer usuário autenticado pode ver
// (todos da equipe se beneficiam de acompanhar o placar).
export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = Number(searchParams.get('month'))
  const year = Number(searchParams.get('year'))

  if (!month || !year) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  // Usa admin client pois o placar precisa agregar entries de TODOS os
  // profissionais (médico, enfermeira, técnico, ACS), não só do usuário logado.
  const admin = getSupabaseAdmin()

  const { data: entriesData, error: entriesError } = await admin
    .from('checklist_entries')
    .select('item_id, status, observation, quantity, updated_at')
    .eq('ubs_id', DEFAULT_UBS_ID)
    .eq('month', month)
    .eq('year', year)

  if (entriesError) {
    return NextResponse.json({ error: entriesError.message }, { status: 500 })
  }

  const allEntries: Record<string, ChecklistEntry> = {}
  for (const row of entriesData || []) {
    allEntries[row.item_id] = {
      itemId: row.item_id,
      done: row.status === 'concluido',
      status: row.status,
      observation: row.observation || '',
      quantity: row.quantity || '',
      updatedAt: row.updated_at,
    }
  }

  const { data: targetsData } = await admin
    .from('previne_indicator_targets')
    .select('*')
    .eq('ubs_id', DEFAULT_UBS_ID)

  const targets: PrevineIndicatorTarget[] = (targetsData || []).map((t) => ({
    id: t.id,
    ubs_id: t.ubs_id,
    target_percent: t.target_percent,
    quadrimestre: t.quadrimestre,
    updated_at: t.updated_at,
  }))

  const scores = computePrevineScores(allEntries, targets)

  return NextResponse.json({ scores })
}
