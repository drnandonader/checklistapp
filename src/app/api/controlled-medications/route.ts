import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

// GET /api/controlled-medications?patient_id=xxx — lista medicações de um paciente
export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const patientId = searchParams.get('patient_id')
  if (!patientId) return NextResponse.json({ error: 'patient_id é obrigatório' }, { status: 400 })

  const { data, error } = await supabase
    .from('controlled_medications')
    .select('*')
    .eq('patient_id', patientId)
    .eq('active', true)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ medications: data || [] })
}

// POST /api/controlled-medications — cadastra uma medicação controlada
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      patient_id, name, dosage, posology, med_class,
      prescription_end_date, duration_days, last_renewed_at, notes,
    } = body

    if (!patient_id || !name || !name.trim()) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('controlled_medications')
      .insert({
        patient_id,
        name: name.trim(),
        dosage: dosage || '',
        posology: posology || '',
        med_class: med_class || 'outro_controlado',
        prescription_end_date: prescription_end_date || null,
        duration_days: duration_days || null,
        last_renewed_at: last_renewed_at || null,
        notes: notes || '',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, medication: data })
  } catch (err) {
    console.error('[controlled-medications POST]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH /api/controlled-medications — edita uma medicação (incl. renovar receita)
export async function PATCH(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const body = await req.json()
    const { id, ...fields } = body
    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

    const allowedFields = [
      'name', 'dosage', 'posology', 'med_class',
      'prescription_end_date', 'duration_days', 'last_renewed_at', 'notes',
    ]
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowedFields) {
      if (fields[key] !== undefined) updates[key] = fields[key]
    }

    const { error } = await supabase.from('controlled_medications').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[controlled-medications PATCH]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE /api/controlled-medications?id=xxx — remove (soft delete) uma medicação
export async function DELETE(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

  const { error } = await supabase
    .from('controlled_medications')
    .update({ active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
