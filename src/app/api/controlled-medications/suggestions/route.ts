import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { COMMON_CONTROLLED_MEDICATIONS } from '@/lib/medicationList'

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const q = new URL(req.url).searchParams.get('q') ?? ''
  if (q.trim().length < 2) return NextResponse.json({ fromDb: [], fromList: [] })

  const admin = getSupabaseAdmin()

  const { data: profile } = await admin
    .from('profiles')
    .select('ubs_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) return NextResponse.json({ fromDb: [], fromList: [] })

  const { data: agents } = await admin
    .from('health_agents')
    .select('id')
    .eq('ubs_id', profile.ubs_id)
    .eq('active', true)

  const agentIds = (agents || []).map((a: { id: string }) => a.id)
  if (agentIds.length === 0) return NextResponse.json({ fromDb: [], fromList: [] })

  const { data: patients } = await admin
    .from('agent_patients')
    .select('id')
    .in('agent_id', agentIds)
    .eq('active', true)

  const patientIds = (patients || []).map((p: { id: string }) => p.id)
  if (patientIds.length === 0) return NextResponse.json({ fromDb: [], fromList: [] })

  const { data: meds } = await admin
    .from('controlled_medications')
    .select('name')
    .in('patient_id', patientIds)
    .eq('active', true)
    .ilike('name', `%${q.trim()}%`)

  const counts: Record<string, number> = {}
  for (const m of meds || []) {
    counts[(m as { name: string }).name] = (counts[(m as { name: string }).name] || 0) + 1
  }
  const fromDb = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name)

  const dbFirstWords = new Set(fromDb.map((n) => n.toLowerCase().split(' ')[0]))
  const qLower = q.trim().toLowerCase()

  const fromList = COMMON_CONTROLLED_MEDICATIONS
    .filter((m) => {
      const mLower = m.toLowerCase()
      return mLower.includes(qLower) && !dbFirstWords.has(mLower.split(' ')[0])
    })
    .slice(0, 5)

  return NextResponse.json({ fromDb, fromList })
}
