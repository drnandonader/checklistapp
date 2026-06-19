import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin, DEFAULT_UBS_ID } from '@/lib/supabaseAdmin'

// GET /api/health-agents — lista agentes de saúde ativos
export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
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
    const admin = getSupabaseAdmin()
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('professional, active')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[health-agents POST] profile lookup failed', profileError)
      return NextResponse.json({ error: 'Não foi possível validar seu perfil' }, { status: 500 })
    }

    if (!profile?.active || profile.professional !== 'coordenacao') {
      return NextResponse.json(
        { error: 'Apenas a coordenação pode cadastrar agentes' },
        { status: 403 }
      )
    }

    const { name } = await req.json()
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('health_agents')
      .insert({ ubs_id: DEFAULT_UBS_ID, name: name.trim() })
      .select()
      .single()

    if (error) {
      console.error('[health-agents POST] insert failed', error)
      return NextResponse.json({ error: `Erro ao cadastrar agente: ${error.message}` }, { status: 500 })
    }

    console.log('[health-agents POST] agent created', { agentId: data.id, userId: user.id })
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

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('professional, active')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.active || profile.professional !== 'coordenacao') {
    return NextResponse.json({ error: 'Apenas a coordenação pode remover agentes' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

  const { error } = await admin
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
