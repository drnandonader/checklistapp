import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

async function requireAuth() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET(req: NextRequest) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const patientId = searchParams.get('patient_id')
  if (!patientId) return NextResponse.json({ error: 'patient_id é obrigatório' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('patient_observations')
    .select('*')
    .eq('patient_id', patientId)
    .order('resolved', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Erro ao carregar observações' }, { status: 500 })

  return NextResponse.json({ observations: data || [] })
}

export async function POST(req: NextRequest) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { patient_id, text } = await req.json()
    if (!patient_id || !text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }
    if (text.length > 1000) {
      return NextResponse.json({ error: 'Texto muito longo' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('patient_observations')
      .insert({ patient_id, text: text.trim().slice(0, 1000) })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Erro ao criar observação' }, { status: 500 })

    return NextResponse.json({ success: true, observation: data })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { id, resolved, text } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (resolved !== undefined) updates.resolved = Boolean(resolved)
    if (text !== undefined) updates.text = String(text).slice(0, 1000)

    const admin = getSupabaseAdmin()
    const { error } = await admin.from('patient_observations').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { error } = await admin.from('patient_observations').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Erro ao remover' }, { status: 500 })

  return NextResponse.json({ success: true })
}
