import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { DEFAULT_UBS_ID } from '@/lib/supabaseAdmin'

// GET /api/agent-patients?agent_id=xxx — lista pacientes de um agente
export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agent_id')
  if (!agentId) return NextResponse.json({ error: 'agent_id é obrigatório' }, { status: 400 })

  const { data, error } = await supabase
    .from('agent_patients')
    .select('*')
    .eq('ubs_id', DEFAULT_UBS_ID)
    .eq('agent_id', agentId)
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ patients: data || [] })
}

// POST /api/agent-patients — cadastra um novo paciente sob um agente
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { agent_id, name, notes } = await req.json()
    if (!agent_id || !name || !name.trim()) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('agent_patients')
      .insert({ ubs_id: DEFAULT_UBS_ID, agent_id, name: name.trim(), notes: notes || '' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, patient: data })
  } catch (err) {
    console.error('[agent-patients POST]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH /api/agent-patients — edita nome/observação de um paciente
export async function PATCH(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id, name, notes } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (notes !== undefined) updates.notes = notes

  const { error } = await supabase.from('agent_patients').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// DELETE /api/agent-patients?id=xxx — remove (soft delete) um paciente
export async function DELETE(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

  const { error } = await supabase
    .from('agent_patients')
    .update({ active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
