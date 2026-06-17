import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { DEFAULT_UBS_ID } from '@/lib/supabaseAdmin'

// GET /api/health-agents — lista agentes de saúde ativos
export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabase
    .from('health_agents')
    .select('*')
    .eq('ubs_id', DEFAULT_UBS_ID)
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ agents: data || [] })
}

// POST /api/health-agents — cria um novo agente de saúde (coordenação)
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { name } = await req.json()
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('health_agents')
      .insert({ ubs_id: DEFAULT_UBS_ID, name: name.trim() })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Sem permissão para cadastrar agentes (apenas coordenação): ${error.message}` },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true, agent: data })
  } catch (err) {
    console.error('[health-agents POST]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE /api/health-agents?id=xxx — desativa um agente (soft delete)
export async function DELETE(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

  const { error } = await supabase
    .from('health_agents')
    .update({ active: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: `Sem permissão (apenas coordenação): ${error.message}` },
      { status: 403 }
    )
  }

  return NextResponse.json({ success: true })
}
