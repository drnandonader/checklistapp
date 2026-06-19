import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

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
  const patientId = searchParams.get('patient_id')
  if (!patientId) return NextResponse.json({ error: 'patient_id é obrigatório' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('controlled_medications')
    .select('*')
    .eq('patient_id', patientId)
    .eq('active', true)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: 'Erro ao carregar medicações' }, { status: 500 })

  return NextResponse.json({ medications: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (!(await checkRole(user.id))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const {
      patient_id, name, dosage, posology, med_class,
      prescription_end_date, duration_days, last_renewed_at, notes,
    } = body

    if (!patient_id || !name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }
    if (name.length > 200) {
      return NextResponse.json({ error: 'Nome muito longo' }, { status: 400 })
    }

    const validClasses = ['psicotropico', 'antipsicotico', 'opioide', 'anticonvulsivante', 'outro_controlado']
    const safeMedClass = validClasses.includes(med_class) ? med_class : 'outro_controlado'

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('controlled_medications')
      .insert({
        patient_id,
        name: name.trim().slice(0, 200),
        dosage: (dosage || '').slice(0, 100),
        posology: (posology || '').slice(0, 200),
        med_class: safeMedClass,
        prescription_end_date: prescription_end_date || null,
        duration_days: duration_days || null,
        last_renewed_at: last_renewed_at || null,
        notes: (notes || '').slice(0, 1000),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Erro ao cadastrar medicação' }, { status: 500 })

    return NextResponse.json({ success: true, medication: data })
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

    const admin = getSupabaseAdmin()
    const { error } = await admin.from('controlled_medications').update(updates).eq('id', id)
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
    .from('controlled_medications')
    .update({ active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Erro ao remover' }, { status: 500 })

  return NextResponse.json({ success: true })
}
