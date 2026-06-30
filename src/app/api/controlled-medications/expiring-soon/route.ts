import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { computeRenewalUrgency } from '@/types'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = getSupabaseAdmin()

  const { data: profile } = await admin
    .from('profiles')
    .select('ubs_id, professional, active')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.active) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const allowed = ['acs', 'medico', 'coordenacao', 'enfermeira', 'tecnico']
  if (!allowed.includes(profile.professional)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  // Busca todos pacientes da UBS com seus agentes e medicações ativas
  const { data: patients, error } = await admin
    .from('agent_patients')
    .select(`
      id,
      name,
      agent_id,
      health_agents!inner ( id, name, ubs_id ),
      controlled_medications ( id, name, prescription_end_date, duration_days, last_renewed_at, active )
    `)
    .eq('health_agents.ubs_id', profile.ubs_id)
    .eq('active', true)

  if (error) return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })

  const alerts: {
    patient_id: string
    patient_name: string
    agent_id: string
    agent_name: string
    med_id: string
    med_name: string
    days_remaining: number
    due_date: string
    is_expired: boolean
  }[] = []

  for (const patient of patients || []) {
    const agent = Array.isArray(patient.health_agents) ? patient.health_agents[0] : patient.health_agents
    const meds = (patient.controlled_medications as Array<{
      id: string
      name: string
      prescription_end_date?: string
      duration_days?: number
      last_renewed_at?: string
      active: boolean
    }>).filter((m) => m.active)

    for (const med of meds) {
      const { urgency, daysRemaining, dueDate } = computeRenewalUrgency(med)
      if (urgency === 'atencao' || urgency === 'vencido') {
        alerts.push({
          patient_id: patient.id,
          patient_name: patient.name,
          agent_id: agent?.id ?? '',
          agent_name: agent?.name ?? '',
          med_id: med.id,
          med_name: med.name,
          days_remaining: daysRemaining ?? 0,
          due_date: dueDate ?? '',
          is_expired: urgency === 'vencido',
        })
      }
    }
  }

  // Ordena: vencidas primeiro, depois por dias restantes crescente
  alerts.sort((a, b) => {
    if (a.is_expired !== b.is_expired) return a.is_expired ? -1 : 1
    return a.days_remaining - b.days_remaining
  })

  return NextResponse.json({ alerts })
}
