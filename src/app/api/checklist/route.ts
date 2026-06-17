import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { DEFAULT_UBS_ID } from '@/lib/supabaseAdmin'
import { ChecklistEntry } from '@/types'

// GET /api/checklist?month=6&year=2026&professional=medico
// O RLS no Supabase já garante que só retorna dados se o usuário
// logado pertence àquela categoria profissional ou é coordenação.
export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = Number(searchParams.get('month'))
  const year = Number(searchParams.get('year'))
  const professional = searchParams.get('professional')

  if (!month || !year || !professional) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('checklist_entries')
    .select('item_id, done, status, observation, quantity, updated_at')
    .eq('ubs_id', DEFAULT_UBS_ID)
    .eq('professional', professional)
    .eq('month', month)
    .eq('year', year)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const entries: Record<string, ChecklistEntry> = {}
  for (const row of data || []) {
    entries[row.item_id] = {
      itemId: row.item_id,
      done: row.done,
      status: row.status,
      observation: row.observation || '',
      quantity: row.quantity || '',
      updatedAt: row.updated_at,
    }
  }

  return NextResponse.json({ entries })
}

// POST /api/checklist — salva/atualiza um item
// O RLS bloqueia automaticamente se o usuário tentar escrever em
// uma categoria que não é a sua (a não ser que seja coordenação).
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const body = await req.json()
    const { month, year, professional, itemId, entry } = body as {
      month: number
      year: number
      professional: string
      itemId: string
      entry: Partial<ChecklistEntry>
    }

    if (!month || !year || !professional || !itemId) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    const { error } = await supabase.from('checklist_entries').upsert(
      {
        ubs_id: DEFAULT_UBS_ID,
        professional,
        month,
        year,
        item_id: itemId,
        done: entry.done ?? false,
        status: entry.status ?? 'pendente',
        observation: entry.observation ?? '',
        quantity: entry.quantity ?? '',
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'ubs_id,professional,month,year,item_id' }
    )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[checklist POST]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
