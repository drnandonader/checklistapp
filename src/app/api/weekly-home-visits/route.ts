import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin, DEFAULT_UBS_ID } from '@/lib/supabaseAdmin'

function getWeekDates(date = new Date()) {
  const local = new Date(date)
  local.setHours(12, 0, 0, 0)
  const sunday = new Date(local)
  sunday.setDate(local.getDate() - local.getDay())
  const friday = new Date(sunday)
  friday.setDate(sunday.getDate() + 5)
  return {
    weekStart: sunday.toISOString().slice(0, 10),
    visitDate: friday.toISOString().slice(0, 10),
  }
}

async function getActiveUser() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, active')
    .eq('id', user.id)
    .maybeSingle()

  return profile?.active ? { user, admin } : null
}

export async function GET() {
  const auth = await getActiveUser()
  if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { weekStart, visitDate } = getWeekDates()
  const { data, error } = await auth.admin
    .from('weekly_home_visits')
    .select('*, agent:health_agents(id, name)')
    .eq('ubs_id', DEFAULT_UBS_ID)
    .eq('week_start', weekStart)
    .order('slot_number')

  if (error) {
    console.error('[weekly-home-visits GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ visits: data || [], weekStart, visitDate, maxSlots: 4 })
}

export async function PUT(request: NextRequest) {
  const auth = await getActiveUser()
  if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { slot_number, patient_name, agent_id, notes } = await request.json()
    const slotNumber = Number(slot_number)
    if (![1, 2, 3, 4].includes(slotNumber)) {
      return NextResponse.json({ error: 'Vaga inválida' }, { status: 400 })
    }
    if (!patient_name?.trim() || !agent_id) {
      return NextResponse.json({ error: 'Informe o paciente e o agente responsável' }, { status: 400 })
    }

    const { data: agent } = await auth.admin
      .from('health_agents')
      .select('id')
      .eq('id', agent_id)
      .eq('active', true)
      .maybeSingle()
    if (!agent) return NextResponse.json({ error: 'Agente inválido ou inativo' }, { status: 400 })

    const { weekStart, visitDate } = getWeekDates()
    const { data, error } = await auth.admin
      .from('weekly_home_visits')
      .upsert({
        ubs_id: DEFAULT_UBS_ID,
        week_start: weekStart,
        visit_date: visitDate,
        slot_number: slotNumber,
        patient_name: patient_name.trim(),
        agent_id,
        notes: notes?.trim() || '',
        updated_by: auth.user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'ubs_id,week_start,slot_number' })
      .select('*, agent:health_agents(id, name)')
      .single()

    if (error) {
      console.error('[weekly-home-visits PUT]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, visit: data })
  } catch (error) {
    console.error('[weekly-home-visits PUT]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await getActiveUser()
  if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const slotNumber = Number(new URL(request.url).searchParams.get('slot'))
  if (![1, 2, 3, 4].includes(slotNumber)) {
    return NextResponse.json({ error: 'Vaga inválida' }, { status: 400 })
  }

  const { weekStart } = getWeekDates()
  const { error } = await auth.admin
    .from('weekly_home_visits')
    .delete()
    .eq('ubs_id', DEFAULT_UBS_ID)
    .eq('week_start', weekStart)
    .eq('slot_number', slotNumber)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
