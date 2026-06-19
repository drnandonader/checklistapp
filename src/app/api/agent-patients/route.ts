import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin, DEFAULT_UBS_ID } from '@/lib/supabaseAdmin'

const ALLOWED_ROLES = ['acs', 'medico', 'coordenacao']

async function checkRole(userId: string) {
  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from('profiles')
    .select('professional, active')
    .eq('id', userId)
    .maybeSingle()
  if (!data?.active || !ALLOWED_ROLES.includes(data.professional)) return null
  return data
}

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (!(await checkRole(user.id))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agent_id')
  if (!agentId) return NextResponse.json({ error: 'agent_id é obrigatório' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('agent_patients')
    .select('*')
    .eq('ubs_id', DEFAULT_UBS_ID)
    .eq('agent_id', agentId)
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: 'Erro ao carregar pacientes' }, { status: 500 })

  return NextResponse.json({ patients: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (!(await checkRole(user.id))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const { agent_id, name, notes } = await req.json()
    if (!agent_id || !name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }
    if (name.length > 200) {
      return NextResponse.json({ error: 'Nome muito longo' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('agent_patients')
      .insert({ ubs_id: DEFAULT_UBS_ID, agent_id, name: name.trim(), notes: (notes || '').slice(0, 1000) })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Erro ao cadastrar paciente' }, { status: 500 })

    return NextResponse.json({ success: true, patient: data })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (!(await checkRole(user.id))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const { id, name, notes } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = String(name).slice(0, 200)
    if (notes !== undefined) updates.notes = String(notes).slice(0, 1000)

    const admin = getSupabaseAdmin()
    const { error } = await admin
      .from('agent_patients')
      .update(updates)
      .eq('id', id)
      .eq('ubs_id', DEFAULT_UBS_ID)

    if (error) return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (!(await checkRole(user.id))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from('agent_patients')
    .update({ active: false })
    .eq('id', id)
    .eq('ubs_id', DEFAULT_UBS_ID)

  if (error) return NextResponse.json({ error: 'Erro ao remover' }, { status: 500 })

  return NextResponse.json({ success: true })
}
