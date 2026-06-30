# Mobile Medication Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar aba "Receitas" para médico/coordenação com ações rápidas de renovação, e redesenhar a aba "Agentes de Saúde" para ACS com interface mobile-first e autocomplete de medicamentos.

**Architecture:** Quatro componentes novos (`MedRenovationView`, `MobileAgentsView`, `MedicationAutocomplete`, constantes de medicamentos) e um endpoint novo de sugestões. `page.tsx` é o único arquivo existente modificado — adiciona a aba "Receitas" e troca `HealthAgentsPanel` por `MobileAgentsView` para ACS. A coordenação continua usando o `HealthAgentsPanel` existente sem alteração.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Supabase JS v2, Lucide React, date-fns.

## Global Constraints

- Todos os componentes client-side iniciam com `'use client'`
- Server routes: autenticar com `createSupabaseServerClient()`, operar com `getSupabaseAdmin()`
- Touch targets mínimo 48px (`py-3` ou `py-3.5` em botões)
- Dark mode: todas as classes Tailwind incluem variante `dark:`
- Sem `confirm()` do browser — usar confirmação inline em estado React
- Sem novas dependências npm — usar apenas o que já está em `package.json`
- TypeScript: rodar `node_modules/.bin/tsc --noEmit` após cada task para validar

---

### Task 1: Constantes de medicamentos + API de sugestões + atualizar expiring-soon

**Files:**
- Create: `src/lib/medicationList.ts`
- Create: `src/app/api/controlled-medications/suggestions/route.ts`
- Modify: `src/app/api/controlled-medications/expiring-soon/route.ts`

**Interfaces:**
- Produces: `COMMON_CONTROLLED_MEDICATIONS: string[]` de `@/lib/medicationList`
- Produces: `GET /api/controlled-medications/suggestions?q=` → `{ fromDb: string[], fromList: string[] }`
- Produces: `GET /api/controlled-medications/expiring-soon` passa a incluir `med_dosage: string` e `med_class: string` em cada alert

- [ ] **Step 1: Criar lista de medicamentos controlados**

Criar `src/lib/medicationList.ts`:

```ts
export const COMMON_CONTROLLED_MEDICATIONS: string[] = [
  // Benzodiazepínicos
  'Alprazolam', 'Bromazepam', 'Clobazam', 'Clonazepam', 'Diazepam',
  'Flunitrazepam', 'Lorazepam', 'Midazolam', 'Nitrazepam', 'Oxazepam',
  // Hipnóticos
  'Zolpidem', 'Zopiclona',
  // Antipsicóticos
  'Aripiprazol', 'Clorpromazina', 'Clozapina', 'Flufenazina', 'Haloperidol',
  'Olanzapina', 'Quetiapina', 'Risperidona', 'Tioridazina', 'Ziprasidona',
  // Antidepressivos
  'Amitriptilina', 'Bupropiona', 'Clomipramina', 'Duloxetina', 'Escitalopram',
  'Fluoxetina', 'Imipramina', 'Mirtazapina', 'Nortriptilina', 'Paroxetina',
  'Sertralina', 'Trazodona', 'Venlafaxina',
  // Anticonvulsivantes
  'Ácido Valpróico', 'Carbamazepina', 'Fenitoína', 'Fenobarbital', 'Gabapentina',
  'Lamotrigina', 'Levetiracetam', 'Oxcarbazepina', 'Pregabalina', 'Topiramato',
  'Valproato de Sódio',
  // Opioides
  'Codeína', 'Metadona', 'Morfina', 'Tramadol',
  // Estimulantes
  'Anfetamina', 'Lisdexanfetamina', 'Metilfenidato', 'Modafinila',
  // Anticolinérgicos / Antiparkinsonianos
  'Biperideno', 'Triexifenidila',
  // Estabilizadores de humor
  'Carbonato de Lítio',
]
```

- [ ] **Step 2: Criar endpoint de sugestões**

Criar `src/app/api/controlled-medications/suggestions/route.ts`:

```ts
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
```

- [ ] **Step 3: Atualizar expiring-soon para incluir dosage e med_class**

Substituir o conteúdo de `src/app/api/controlled-medications/expiring-soon/route.ts` pelo seguinte (adiciona `dosage` e `med_class` no select e no push do alerts):

```ts
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { computeRenewalUrgency, MedicationClass } from '@/types'

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

  const { data: patients, error } = await admin
    .from('agent_patients')
    .select(`
      id,
      name,
      agent_id,
      health_agents!inner ( id, name, ubs_id ),
      controlled_medications ( id, name, dosage, med_class, prescription_end_date, duration_days, last_renewed_at, active )
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
    med_dosage: string
    med_class: MedicationClass
    days_remaining: number
    due_date: string
    is_expired: boolean
  }[] = []

  for (const patient of patients || []) {
    const agent = Array.isArray(patient.health_agents)
      ? patient.health_agents[0]
      : patient.health_agents
    const meds = (patient.controlled_medications as Array<{
      id: string; name: string; dosage?: string; med_class: MedicationClass
      prescription_end_date?: string; duration_days?: number
      last_renewed_at?: string; active: boolean
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
          med_dosage: med.dosage ?? '',
          med_class: med.med_class,
          days_remaining: daysRemaining ?? 0,
          due_date: dueDate ?? '',
          is_expired: urgency === 'vencido',
        })
      }
    }
  }

  alerts.sort((a, b) => {
    if (a.is_expired !== b.is_expired) return a.is_expired ? -1 : 1
    return a.days_remaining - b.days_remaining
  })

  return NextResponse.json({ alerts })
}
```

- [ ] **Step 4: Verificar tipos**

```bash
node_modules/.bin/tsc --noEmit --project tsconfig.json
```

Esperado: sem erros.

- [ ] **Step 5: Testar manualmente no browser**

Abrir DevTools → Network. Com sessão logada, navegar para:
- `/api/controlled-medications/suggestions?q=clo` → deve retornar `{ fromDb: [...], fromList: ["Clobazam","Clonazepam",...] }`
- `/api/controlled-medications/expiring-soon` → cada alert deve ter campo `med_dosage` e `med_class`

- [ ] **Step 6: Commit**

```bash
git add src/lib/medicationList.ts src/app/api/controlled-medications/suggestions/route.ts src/app/api/controlled-medications/expiring-soon/route.ts
git commit -m "feat: add medication suggestions API and enrich expiring-soon response"
```

---

### Task 2: Componente MedicationAutocomplete

**Files:**
- Create: `src/components/MedicationAutocomplete.tsx`

**Interfaces:**
- Consumes: `GET /api/controlled-medications/suggestions?q=` de Task 1
- Produces: `<MedicationAutocomplete value onChane onDosageSuggested? />` exportado de `@/components/MedicationAutocomplete`

- [ ] **Step 1: Criar o componente**

Criar `src/components/MedicationAutocomplete.tsx`:

```tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Pill } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
  onDosageSuggested?: (dosage: string) => void
}

export function MedicationAutocomplete({ value, onChange, onDosageSuggested }: Props) {
  const [open, setOpen] = useState(false)
  const [fromDb, setFromDb] = useState<string[]>([])
  const [fromList, setFromList] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setFromDb([])
      setFromList([])
      setOpen(false)
      return
    }
    try {
      const res = await fetch(
        `/api/controlled-medications/suggestions?q=${encodeURIComponent(q.trim())}`
      )
      if (!res.ok) return
      const data = await res.json()
      const db: string[] = data.fromDb || []
      const list: string[] = data.fromList || []
      setFromDb(db)
      setFromList(list)
      if (db.length + list.length > 0) setOpen(true)
    } catch {
      // autocomplete failure is silent — user can still type manually
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchSuggestions(value), 250)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value, fetchSuggestions])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function select(suggestion: string) {
    // Extract dosage if suggestion ends with a pattern like "2mg", "0,5mg", "5ml"
    const match = suggestion.match(/^(.+?)\s+(\d[\d,.]*(mg|mcg|ml|g|UI|u))$/i)
    if (match) {
      onChange(match[1])
      onDosageSuggested?.(match[2])
    } else {
      onChange(suggestion)
    }
    setOpen(false)
  }

  const hasSuggestions = fromDb.length > 0 || fromList.length > 0

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
        onFocus={() => { if (hasSuggestions) setOpen(true) }}
        placeholder="Ex: Clonazepam"
        autoComplete="off"
        className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700"
      />
      {open && hasSuggestions && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {fromDb.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-4 pt-3 pb-1 uppercase tracking-wide">
                Já usados nesta UBS
              </p>
              {fromDb.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); select(s) }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/30 active:bg-blue-100 dark:active:bg-blue-900/50 text-left"
                >
                  <Pill className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  {s}
                </button>
              ))}
            </>
          )}
          {fromList.length > 0 && (
            <>
              {fromDb.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-700" />
              )}
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-4 pt-3 pb-1 uppercase tracking-wide">
                Sugestões
              </p>
              {fromList.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); select(s) }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 text-left"
                >
                  <Pill className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  {s}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
node_modules/.bin/tsc --noEmit --project tsconfig.json
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/MedicationAutocomplete.tsx
git commit -m "feat: add MedicationAutocomplete component with debounced suggestions"
```

---

### Task 3: MobileAgentsView

**Files:**
- Create: `src/components/MobileAgentsView.tsx`

**Interfaces:**
- Consumes: `MedicationAutocomplete` de `@/components/MedicationAutocomplete` (Task 2)
- Consumes: APIs existentes: `GET /api/health-agents`, `GET/POST/PATCH/DELETE /api/agent-patients`, `GET/POST/PATCH/DELETE /api/controlled-medications`, `GET/POST/PATCH/DELETE /api/patient-observations`
- Consumes: `computeRenewalUrgency`, `RENEWAL_URGENCY_COLORS`, `RENEWAL_URGENCY_LABELS`, `MEDICATION_CLASS_LABELS`, `MEDICATION_CLASS_COLORS`, `MedicationClass`, `ControlledMedication`, `HealthAgent`, `AgentPatient` de `@/types`
- Produces: `<MobileAgentsView />` exportado de `@/components/MobileAgentsView`

- [ ] **Step 1: Criar o componente**

Criar `src/components/MobileAgentsView.tsx`:

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  HealthAgent, AgentPatient, ControlledMedication, MedicationClass,
  MEDICATION_CLASS_LABELS, MEDICATION_CLASS_COLORS,
  RENEWAL_URGENCY_LABELS, RENEWAL_URGENCY_COLORS, computeRenewalUrgency,
} from '@/types'
import { MedicationAutocomplete } from '@/components/MedicationAutocomplete'
import {
  ChevronRight, ArrowLeft, Loader2, Plus, Check, X,
  Pill, Trash2, Pencil, AlertTriangle, ClipboardList,
  Circle, CheckCircle2, Users,
} from 'lucide-react'

type ViewLevel = 'agents' | 'patients' | 'medications'

export function MobileAgentsView() {
  const [view, setView] = useState<ViewLevel>('agents')
  const [selectedAgent, setSelectedAgent] = useState<HealthAgent | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<AgentPatient | null>(null)

  function goBack() {
    if (view === 'medications') { setSelectedPatient(null); setView('patients') }
    else if (view === 'patients') { setSelectedAgent(null); setView('agents') }
  }

  return (
    <div className="pb-24">
      {view !== 'agents' && (
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 py-3 mb-2"
        >
          <ArrowLeft className="w-5 h-5" />
          {view === 'medications'
            ? `Pacientes de ${selectedAgent?.name}`
            : 'Agentes de Saúde'}
        </button>
      )}

      {view === 'agents' && (
        <AgentsListView
          onSelect={(agent) => { setSelectedAgent(agent); setView('patients') }}
        />
      )}
      {view === 'patients' && selectedAgent && (
        <PatientsListView
          agent={selectedAgent}
          onSelect={(patient) => { setSelectedPatient(patient); setView('medications') }}
        />
      )}
      {view === 'medications' && selectedPatient && (
        <MedicationsView patient={selectedPatient} />
      )}
    </div>
  )
}

// ─── Agents Level ────────────────────────────────────────────────────────────

function AgentsListView({ onSelect }: { onSelect: (a: HealthAgent) => void }) {
  const [agents, setAgents] = useState<HealthAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [urgentByAgent, setUrgentByAgent] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [agentsRes, urgentRes] = await Promise.all([
        fetch('/api/health-agents'),
        fetch('/api/controlled-medications/expiring-soon'),
      ])
      if (!agentsRes.ok) { setError('Não foi possível carregar os agentes.'); setLoading(false); return }
      const { agents: list } = await agentsRes.json()
      setAgents(list || [])

      if (urgentRes.ok) {
        const { alerts } = await urgentRes.json()
        const counts: Record<string, number> = {}
        for (const a of alerts || []) {
          counts[a.agent_id] = (counts[a.agent_id] || 0) + 1
        }
        setUrgentByAgent(counts)
      }
    } catch {
      setError('Falha de conexão.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
  if (error) return (
    <div className="text-center py-16">
      <p className="text-sm text-red-500 dark:text-red-400 mb-3">{error}</p>
      <button onClick={load} className="text-sm text-blue-600 dark:text-blue-400 font-medium">Tentar novamente</button>
    </div>
  )
  if (agents.length === 0) return (
    <div className="text-center py-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <Users className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
      <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum agente cadastrado ainda.</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Peça à coordenação para cadastrar os agentes.</p>
    </div>
  )

  return (
    <div className="space-y-2">
      <h2 className="text-base font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
        <Users className="w-4 h-4 text-blue-500" />
        Agentes de Saúde
      </h2>
      {agents.map((agent) => {
        const urgent = urgentByAgent[agent.id] || 0
        return (
          <button
            key={agent.id}
            onClick={() => onSelect(agent)}
            className="w-full flex items-center gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 hover:border-blue-300 dark:hover:border-blue-800 active:bg-gray-50 dark:active:bg-gray-800 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 flex items-center justify-center font-bold text-lg flex-shrink-0">
              {agent.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 dark:text-gray-100">{agent.name}</p>
              {urgent > 0 && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1 mt-0.5">
                  <AlertTriangle className="w-3 h-3" />
                  {urgent} receita(s) a renovar
                </p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-600 flex-shrink-0" />
          </button>
        )
      })}
    </div>
  )
}

// ─── Patients Level ───────────────────────────────────────────────────────────

function PatientsListView({
  agent, onSelect,
}: { agent: HealthAgent; onSelect: (p: AgentPatient) => void }) {
  const [patients, setPatients] = useState<AgentPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [urgentByPatient, setUrgentByPatient] = useState<Record<string, number>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pRes, urgentRes] = await Promise.all([
        fetch(`/api/agent-patients?agent_id=${agent.id}`),
        fetch('/api/controlled-medications/expiring-soon'),
      ])
      if (!pRes.ok) { setError('Não foi possível carregar os pacientes.'); setLoading(false); return }
      const { patients: list } = await pRes.json()
      setPatients(list || [])

      if (urgentRes.ok) {
        const { alerts } = await urgentRes.json()
        const counts: Record<string, number> = {}
        for (const a of alerts || []) {
          if (a.agent_id === agent.id) counts[a.patient_id] = (counts[a.patient_id] || 0) + 1
        }
        setUrgentByPatient(counts)
      }
    } catch {
      setError('Falha de conexão.')
    }
    setLoading(false)
  }, [agent.id])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!newName.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/agent-patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agent.id, name: newName.trim(), notes: newNotes.trim() }),
      })
      if (res.ok) { setNewName(''); setNewNotes(''); setShowAdd(false); await load() }
    } catch {}
    setAdding(false)
  }

  async function handleRemove(id: string) {
    await fetch(`/api/agent-patients?id=${id}`, { method: 'DELETE' })
    setPatients((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div>
      <h2 className="text-base font-bold text-gray-800 dark:text-white mb-4">
        Pacientes de <span className="text-orange-600 dark:text-orange-400">{agent.name}</span>
      </h2>

      {showAdd && (
        <div className="bg-white dark:bg-gray-900 border-2 border-blue-300 dark:border-blue-700 rounded-2xl p-4 mb-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Novo paciente</p>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome completo do paciente *"
            autoFocus
            className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <input
            type="text"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Endereço, condição, observação (opcional)"
            className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-3.5 rounded-xl text-sm font-semibold transition-colors"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Adicionar
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewName(''); setNewNotes('') }}
              className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error} <button onClick={load} className="underline ml-1">Tentar novamente</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : patients.length === 0 && !showAdd ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum paciente cadastrado ainda.</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Toque em "+ Novo Paciente" para adicionar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {patients.map((p) => {
            const urgent = urgentByPatient[p.id] || 0
            return (
              <PatientCard
                key={p.id}
                patient={p}
                urgentCount={urgent}
                onSelect={() => onSelect(p)}
                onRemove={() => handleRemove(p.id)}
              />
            )
          })}
        </div>
      )}

      {/* Fixed bottom button */}
      {!showAdd && (
        <div className="fixed bottom-4 left-4 right-4 z-20 max-w-2xl mx-auto">
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-4 rounded-2xl text-sm font-bold shadow-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Paciente
          </button>
        </div>
      )}
    </div>
  )
}

function PatientCard({
  patient, urgentCount, onSelect, onRemove,
}: { patient: AgentPatient; urgentCount: number; onSelect: () => void; onRemove: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (confirmDelete) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl p-4">
        <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">Remover {patient.name}?</p>
        <p className="text-xs text-red-600 dark:text-red-400 mb-3">Esta ação não pode ser desfeita.</p>
        <div className="flex gap-2">
          <button
            onClick={() => { onRemove(); setConfirmDelete(false) }}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-sm font-semibold"
          >
            Sim, remover
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 py-3 rounded-xl text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 hover:border-blue-300 dark:hover:border-blue-800 transition-colors group">
      <button onClick={onSelect} className="flex-1 min-w-0 text-left">
        <p className="font-semibold text-gray-800 dark:text-gray-100">{patient.name}</p>
        {patient.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{patient.notes}</p>}
        {urgentCount > 0 && (
          <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1 mt-1">
            <AlertTriangle className="w-3 h-3" />
            {urgentCount} receita(s) a renovar
          </p>
        )}
      </button>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => setConfirmDelete(true)}
          className="p-3 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 rounded-xl transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button onClick={onSelect} className="p-2">
          <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-600" />
        </button>
      </div>
    </div>
  )
}

// ─── Medications Level ────────────────────────────────────────────────────────

function MedicationsView({ patient }: { patient: AgentPatient }) {
  const [section, setSection] = useState<'meds' | 'obs'>('meds')

  return (
    <div>
      <h2 className="text-base font-bold text-gray-800 dark:text-white mb-1">
        <span className="text-blue-600 dark:text-blue-400">{patient.name}</span>
      </h2>
      {patient.notes && (
        <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 mb-3">
          📝 {patient.notes}
        </p>
      )}

      <div className="flex border-b border-gray-200 dark:border-gray-800 mb-4">
        {(['meds', 'obs'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`flex-1 text-sm font-semibold py-3.5 border-b-2 transition-colors flex items-center justify-center gap-2 ${
              section === s
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400'
            }`}
          >
            {s === 'meds' ? <><Pill className="w-4 h-4" /> Medicações</> : <><ClipboardList className="w-4 h-4" /> Observações</>}
          </button>
        ))}
      </div>

      {section === 'meds' ? <MedsSection patientId={patient.id} /> : <ObsSection patientId={patient.id} />}
    </div>
  )
}

// ─── Medications Section ──────────────────────────────────────────────────────

function MedsSection({ patientId }: { patientId: string }) {
  const [meds, setMeds] = useState<ControlledMedication[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/controlled-medications?patient_id=${patientId}`)
    if (res.ok) { const d = await res.json(); setMeds(d.medications || []) }
    setLoading(false)
  }, [patientId])

  useEffect(() => { load() }, [load])

  async function handleRemove(id: string) {
    await fetch(`/api/controlled-medications?id=${id}`, { method: 'DELETE' })
    setMeds((prev) => prev.filter((m) => m.id !== id))
  }

  async function handleRenew(med: ControlledMedication) {
    const today = new Date().toISOString().slice(0, 10)
    setMeds((prev) => prev.filter((m) => m.id !== med.id)) // optimistic remove from urgent view
    await fetch('/api/controlled-medications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: med.id, last_renewed_at: today, prescription_end_date: null }),
    })
    await load()
  }

  const urgencyOrder = { vencido: 0, atencao: 1, ok: 2, indefinido: 3 }
  const sorted = [...meds].sort((a, b) => {
    const ua = computeRenewalUrgency(a).urgency
    const ub = computeRenewalUrgency(b).urgency
    return urgencyOrder[ua] - urgencyOrder[ub]
  })

  return (
    <div className="pb-24">
      {showAdd && (
        <MedForm
          patientId={patientId}
          onSaved={() => { setShowAdd(false); load() }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : sorted.length === 0 && !showAdd ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <Pill className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma medicação cadastrada.</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Toque em "+ Nova Medicação" para adicionar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((med) =>
            editingId === med.id ? (
              <MedForm
                key={med.id}
                patientId={patientId}
                existing={med}
                onSaved={() => { setEditingId(null); load() }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <MedCard
                key={med.id}
                med={med}
                onEdit={() => setEditingId(med.id)}
                onRemove={() => handleRemove(med.id)}
                onRenew={() => handleRenew(med)}
              />
            )
          )}
        </div>
      )}

      {!showAdd && editingId === null && (
        <div className="fixed bottom-4 left-4 right-4 z-20 max-w-2xl mx-auto">
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-4 rounded-2xl text-sm font-bold shadow-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Medicação
          </button>
        </div>
      )}
    </div>
  )
}

function MedCard({
  med, onEdit, onRemove, onRenew,
}: { med: ControlledMedication; onEdit: () => void; onRemove: () => void; onRenew: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { urgency, dueDate, daysRemaining } = computeRenewalUrgency(med)

  if (confirmDelete) {
    return (
      <div className={`rounded-2xl border p-4 ${RENEWAL_URGENCY_COLORS[urgency]}`}>
        <p className="text-sm font-semibold mb-1">Remover {med.name}?</p>
        <p className="text-xs opacity-70 mb-3">Esta ação não pode ser desfeita.</p>
        <div className="flex gap-2">
          <button
            onClick={() => { onRemove(); setConfirmDelete(false) }}
            className="flex-1 bg-red-600 text-white py-3 rounded-xl text-sm font-semibold"
          >
            Sim, remover
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="flex-1 border border-current py-3 rounded-xl text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border p-4 ${RENEWAL_URGENCY_COLORS[urgency]}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{med.name}</p>
            {med.dosage && <span className="text-xs text-gray-500 dark:text-gray-400">{med.dosage}</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MEDICATION_CLASS_COLORS[med.med_class]}`}>
              {MEDICATION_CLASS_LABELS[med.med_class]}
            </span>
          </div>
          {med.posology && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">📋 {med.posology}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${RENEWAL_URGENCY_COLORS[urgency]}`}>
              {RENEWAL_URGENCY_LABELS[urgency]}
            </span>
            {dueDate && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {urgency === 'vencido'
                  ? `Venceu há ${Math.abs(daysRemaining!)} dia(s)`
                  : `Vence em ${daysRemaining} dia(s)`}
                {' · '}{new Date(dueDate).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
          {med.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">📝 {med.notes}</p>}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={onEdit} className="p-3 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => setConfirmDelete(true)} className="p-3 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {(urgency === 'atencao' || urgency === 'vencido') && (
        <button
          onClick={onRenew}
          className="w-full bg-white dark:bg-gray-800 border border-current text-xs font-bold py-3 rounded-xl hover:opacity-80 transition-opacity mt-1"
        >
          ✓ Marcar como renovada hoje
        </button>
      )}
    </div>
  )
}

// ─── Medication Form ──────────────────────────────────────────────────────────

function MedForm({
  patientId, existing, onSaved, onCancel,
}: { patientId: string; existing?: ControlledMedication; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState(existing?.name || '')
  const [dosage, setDosage] = useState(existing?.dosage || '')
  const [posology, setPosology] = useState(existing?.posology || '')
  const [medClass, setMedClass] = useState<MedicationClass>(existing?.med_class || 'psicotropico')
  const [dateMode, setDateMode] = useState<'fixed' | 'duration'>(
    existing?.prescription_end_date ? 'fixed' : 'duration'
  )
  const [endDate, setEndDate] = useState(existing?.prescription_end_date?.slice(0, 10) || '')
  const [durationDays, setDurationDays] = useState(existing?.duration_days?.toString() || '30')
  const [lastRenewed, setLastRenewed] = useState(
    existing?.last_renewed_at?.slice(0, 10) || new Date().toISOString().slice(0, 10)
  )
  const [notes, setNotes] = useState(existing?.notes || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const payload = {
      patient_id: patientId,
      name: name.trim(),
      dosage: dosage.trim(),
      posology: posology.trim(),
      med_class: medClass,
      prescription_end_date: dateMode === 'fixed' ? (endDate || null) : null,
      duration_days: dateMode === 'duration' ? (Number(durationDays) || null) : null,
      last_renewed_at: dateMode === 'duration' ? (lastRenewed || null) : null,
      notes: notes.trim(),
    }
    await fetch('/api/controlled-medications', {
      method: existing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(existing ? { id: existing.id, ...payload } : payload),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="bg-white dark:bg-gray-900 border-2 border-blue-300 dark:border-blue-700 rounded-2xl p-4 space-y-4 mb-4">
      <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
        {existing ? 'Editar medicação' : 'Nova medicação'}
      </p>

      <div>
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
          Nome do medicamento *
        </label>
        <MedicationAutocomplete
          value={name}
          onChange={setName}
          onDosageSuggested={(d) => { if (!dosage) setDosage(d) }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Dosagem</label>
          <input
            type="text"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="Ex: 2mg"
            className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-3 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Classe</label>
          <select
            value={medClass}
            onChange={(e) => setMedClass(e.target.value as MedicationClass)}
            className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-3 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {(Object.keys(MEDICATION_CLASS_LABELS) as MedicationClass[]).map((c) => (
              <option key={c} value={c}>{MEDICATION_CLASS_LABELS[c]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Posologia</label>
        <input
          type="text"
          value={posology}
          onChange={(e) => setPosology(e.target.value)}
          placeholder="Ex: 1 comprimido à noite"
          className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-3 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
          Controle de vencimento
        </label>
        <div className="flex gap-2 mb-3">
          {(['fixed', 'duration'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setDateMode(mode)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                dateMode === mode
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
              }`}
            >
              {mode === 'fixed' ? 'Data exata' : 'Duração em dias'}
            </button>
          ))}
        </div>
        {dateMode === 'fixed' ? (
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-3 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Última renovação</label>
              <input
                type="date"
                value={lastRenewed}
                onChange={(e) => setLastRenewed(e.target.value)}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-3 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Dias de duração</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-3 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Observações</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anotações sobre essa medicação..."
          className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-3.5 rounded-xl text-sm font-bold transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {existing ? 'Salvar alterações' : 'Adicionar medicação'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400 rounded-xl border border-gray-200 dark:border-gray-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Observations Section ─────────────────────────────────────────────────────

interface Observation {
  id: string; patient_id: string; text: string
  resolved: boolean; created_at: string; updated_at: string
}

function ObsSection({ patientId }: { patientId: string }) {
  const [observations, setObservations] = useState<Observation[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')
  const [adding, setAdding] = useState(false)
  const [showResolved, setShowResolved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/patient-observations?patient_id=${patientId}`)
    if (res.ok) { const d = await res.json(); setObservations(d.observations || []) }
    setLoading(false)
  }, [patientId])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!newText.trim()) return
    setAdding(true)
    const res = await fetch('/api/patient-observations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, text: newText.trim() }),
    })
    setAdding(false)
    if (res.ok) { setNewText(''); await load() }
  }

  async function toggleResolved(obs: Observation) {
    setObservations((prev) => prev.map((o) => o.id === obs.id ? { ...o, resolved: !o.resolved } : o))
    await fetch('/api/patient-observations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: obs.id, resolved: !obs.resolved }),
    })
  }

  async function handleRemove(id: string) {
    await fetch(`/api/patient-observations?id=${id}`, { method: 'DELETE' })
    setObservations((prev) => prev.filter((o) => o.id !== id))
  }

  const pending = observations.filter((o) => !o.resolved)
  const resolved = observations.filter((o) => o.resolved)

  return (
    <div className="space-y-3 pb-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Ex: Solicitar laudo de fralda, exame pendente..."
          className="flex-1 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newText.trim()}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-3.5 rounded-xl text-sm font-semibold shrink-0"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
      ) : pending.length === 0 && resolved.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <ClipboardList className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma observação registrada ainda.</p>
        </div>
      ) : (
        <>
          {pending.map((obs) => (
            <div key={obs.id} className="flex items-start gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 group">
              <button onClick={() => toggleResolved(obs)} className="mt-0.5 text-gray-300 hover:text-green-500 dark:text-gray-600 dark:hover:text-green-400 transition-colors shrink-0 p-1">
                <Circle className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-100">{obs.text}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(obs.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button onClick={() => handleRemove(obs.id)} className="p-2 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {resolved.length > 0 && (
            <div>
              <button
                onClick={() => setShowResolved(!showResolved)}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium mb-2 py-1"
              >
                {showResolved ? '▼' : '▶'} {resolved.length} resolvida(s)
              </button>
              {showResolved && resolved.map((obs) => (
                <div key={obs.id} className="flex items-start gap-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl p-4 mb-2 group">
                  <button onClick={() => toggleResolved(obs)} className="mt-0.5 text-green-500 dark:text-green-400 hover:text-gray-400 transition-colors shrink-0 p-1">
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-400 dark:text-gray-500 line-through">{obs.text}</p>
                    <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                      {new Date(obs.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <button onClick={() => handleRemove(obs.id)} className="p-2 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
node_modules/.bin/tsc --noEmit --project tsconfig.json
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/MobileAgentsView.tsx
git commit -m "feat: add MobileAgentsView with mobile-first UX and inline delete confirmation"
```

---

### Task 4: MedRenovationView (aba Receitas do médico)

**Files:**
- Create: `src/components/MedRenovationView.tsx`

**Interfaces:**
- Consumes: `GET /api/controlled-medications/expiring-soon` (Task 1, com `med_dosage` e `med_class`)
- Consumes: `PATCH /api/controlled-medications` para renovar/editar data
- Consumes: `MobileAgentsView` de `@/components/MobileAgentsView` (Task 3)
- Consumes: `MEDICATION_CLASS_LABELS`, `MedicationClass` de `@/types`
- Produces: `<MedRenovationView />` exportado de `@/components/MedRenovationView`

- [ ] **Step 1: Criar o componente**

Criar `src/components/MedRenovationView.tsx`:

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { MobileAgentsView } from '@/components/MobileAgentsView'
import { MEDICATION_CLASS_LABELS, MedicationClass } from '@/types'
import {
  AlertTriangle, CheckCircle2, Loader2, RefreshCw,
  Users, Calendar, Check, X,
} from 'lucide-react'

interface MedAlert {
  patient_id: string
  patient_name: string
  agent_id: string
  agent_name: string
  med_id: string
  med_name: string
  med_dosage: string
  med_class: MedicationClass
  days_remaining: number
  due_date: string
  is_expired: boolean
}

export function MedRenovationView() {
  const [showAllPatients, setShowAllPatients] = useState(false)

  if (showAllPatients) {
    return (
      <div>
        <button
          onClick={() => setShowAllPatients(false)}
          className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 py-3 mb-2"
        >
          ← Voltar para Receitas Urgentes
        </button>
        <MobileAgentsView />
      </div>
    )
  }

  return <UrgencyPanel onShowAll={() => setShowAllPatients(true)} />
}

function UrgencyPanel({ onShowAll }: { onShowAll: () => void }) {
  const [alerts, setAlerts] = useState<MedAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [renewingId, setRenewingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')
  const [savingDate, setSavingDate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/controlled-medications/expiring-soon')
      if (!res.ok) throw new Error()
      const { alerts: data } = await res.json()
      setAlerts(data || [])
    } catch {
      setError('Não foi possível carregar as receitas.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleRenew(alert: MedAlert) {
    setRenewingId(alert.med_id)
    const today = new Date().toISOString().slice(0, 10)
    // Optimistic removal
    setAlerts((prev) => prev.filter((a) => a.med_id !== alert.med_id))
    try {
      await fetch('/api/controlled-medications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: alert.med_id,
          last_renewed_at: today,
          prescription_end_date: null,
        }),
      })
    } catch {
      // Revert on failure
      await load()
    }
    setRenewingId(null)
  }

  async function handleSaveDate(alert: MedAlert) {
    if (!editDate) return
    setSavingDate(true)
    setAlerts((prev) => prev.filter((a) => a.med_id !== alert.med_id))
    try {
      await fetch('/api/controlled-medications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: alert.med_id, prescription_end_date: editDate }),
      })
    } catch {
      await load()
    }
    setEditingId(null)
    setEditDate('')
    setSavingDate(false)
  }

  const expired = alerts.filter((a) => a.is_expired)
  const expiring = alerts.filter((a) => !a.is_expired)

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-800 dark:text-white">Receitas Urgentes</h2>
        <button
          onClick={onShowAll}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-3 py-2 rounded-xl"
        >
          <Users className="w-3.5 h-3.5" />
          Ver todos os pacientes
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      )}

      {error && (
        <div className="text-center py-16 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl">
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
          <button onClick={load} className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 mx-auto">
            <RefreshCw className="w-4 h-4" /> Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && alerts.length === 0 && (
        <div className="text-center py-16 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-2xl">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-green-800 dark:text-green-200">Nenhuma receita urgente</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">Todas as receitas estão em dia.</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {expired.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                <h3 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wide">
                  Vencidas ({expired.length})
                </h3>
              </div>
              <div className="space-y-2">
                {expired.map((a) => (
                  <AlertCard
                    key={a.med_id}
                    alert={a}
                    isRenewing={renewingId === a.med_id}
                    isEditing={editingId === a.med_id}
                    editDate={editDate}
                    savingDate={savingDate}
                    onRenew={() => handleRenew(a)}
                    onStartEdit={() => { setEditingId(a.med_id); setEditDate('') }}
                    onCancelEdit={() => { setEditingId(null); setEditDate('') }}
                    onEditDateChange={setEditDate}
                    onSaveDate={() => handleSaveDate(a)}
                  />
                ))}
              </div>
            </section>
          )}

          {expiring.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0" />
                <h3 className="text-xs font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide">
                  Vencem em breve ({expiring.length})
                </h3>
              </div>
              <div className="space-y-2">
                {expiring.map((a) => (
                  <AlertCard
                    key={a.med_id}
                    alert={a}
                    isRenewing={renewingId === a.med_id}
                    isEditing={editingId === a.med_id}
                    editDate={editDate}
                    savingDate={savingDate}
                    onRenew={() => handleRenew(a)}
                    onStartEdit={() => { setEditingId(a.med_id); setEditDate('') }}
                    onCancelEdit={() => { setEditingId(null); setEditDate('') }}
                    onEditDateChange={setEditDate}
                    onSaveDate={() => handleSaveDate(a)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

interface AlertCardProps {
  alert: MedAlert
  isRenewing: boolean
  isEditing: boolean
  editDate: string
  savingDate: boolean
  onRenew: () => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onEditDateChange: (d: string) => void
  onSaveDate: () => void
}

function AlertCard({
  alert, isRenewing, isEditing, editDate, savingDate,
  onRenew, onStartEdit, onCancelEdit, onEditDateChange, onSaveDate,
}: AlertCardProps) {
  const borderColor = alert.is_expired
    ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20'
    : 'border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/20'

  return (
    <div className={`rounded-2xl border p-4 ${borderColor}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 dark:text-gray-100">{alert.patient_name}</p>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <span className="text-sm text-gray-700 dark:text-gray-200">{alert.med_name}</span>
            {alert.med_dosage && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{alert.med_dosage}</span>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {MEDICATION_CLASS_LABELS[alert.med_class]}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {alert.is_expired
                ? `Venceu há ${Math.abs(alert.days_remaining)} dia(s)`
                : `Vence em ${alert.days_remaining} dia(s)`}
              {alert.due_date && ` · ${new Date(alert.due_date).toLocaleDateString('pt-BR')}`}
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            ACS: {alert.agent_name}
          </p>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Nova data de vencimento
          </label>
          <input
            type="date"
            value={editDate}
            onChange={(e) => onEditDateChange(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            autoFocus
            className="w-full text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <div className="flex gap-2">
            <button
              onClick={onSaveDate}
              disabled={!editDate || savingDate}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 disabled:opacity-60 text-white py-3 rounded-xl text-sm font-semibold"
            >
              {savingDate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Salvar data
            </button>
            <button
              onClick={onCancelEdit}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-xl"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={onRenew}
            disabled={isRenewing}
            className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 transition-colors"
          >
            {isRenewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-green-600" />}
            Renovar hoje
          </button>
          <button
            onClick={onStartEdit}
            className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Calendar className="w-4 h-4 text-blue-500" />
            Editar data
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
node_modules/.bin/tsc --noEmit --project tsconfig.json
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/MedRenovationView.tsx
git commit -m "feat: add MedRenovationView with urgency grouping and inline renew/edit actions"
```

---

### Task 5: Integrar no page.tsx

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `MedRenovationView` de `@/components/MedRenovationView` (Task 4)
- Consumes: `MobileAgentsView` de `@/components/MobileAgentsView` (Task 3)

- [ ] **Step 1: Adicionar imports no topo de page.tsx**

No arquivo `src/app/page.tsx`, após a linha que importa `AnnouncementsBoard`:

```tsx
import { MedRenovationView } from '@/components/MedRenovationView'
import { MobileAgentsView } from '@/components/MobileAgentsView'
```

- [ ] **Step 2: Adicionar 'receitas' ao tipo SubTab**

Localizar a linha:
```tsx
type SubTab = 'checklist' | 'visitas' | 'faltosos' | 'agentes' | 'mural'
```

Substituir por:
```tsx
type SubTab = 'checklist' | 'visitas' | 'faltosos' | 'agentes' | 'mural' | 'receitas'
```

- [ ] **Step 3: Adicionar aba "Receitas" na lista de botões de abas**

Localizar o bloco de abas (dentro do `div` com `className="flex gap-1 border-b..."`). Adicionar o botão "Receitas" **antes** do botão "Mural de Recados", visível apenas para `medico` e `coordenacao`:

```tsx
{(profile.professional === 'medico' || profile.professional === 'coordenacao') && (
  <button
    onClick={() => setSubTab('receitas')}
    className={`text-sm font-medium px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
      subTab === 'receitas' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400'
    }`}
  >
    Receitas
  </button>
)}
```

- [ ] **Step 4: Trocar HealthAgentsPanel por MobileAgentsView para ACS e renderizar MedRenovationView**

Localizar:
```tsx
{subTab === 'agentes' && (
  <HealthAgentsPanel canManageAgents={false} />
)}
```

Substituir por:
```tsx
{subTab === 'agentes' && (
  profile.professional === 'acs'
    ? <MobileAgentsView />
    : <HealthAgentsPanel canManageAgents={false} />
)}
{subTab === 'receitas' && <MedRenovationView />}
```

- [ ] **Step 5: Verificar tipos**

```bash
node_modules/.bin/tsc --noEmit --project tsconfig.json
```

Esperado: sem erros.

- [ ] **Step 6: Testar manualmente no browser**

Iniciar o app:
```bash
npm run dev
```

Verificar:
1. **Login como ACS** → aba "Agentes de Saúde" usa nova interface mobile (`MobileAgentsView`)
   - Navegar: Agente → Paciente → Medicações
   - Digitar 3 letras no campo de medicamento → dropdown de sugestões aparece
   - Selecionar sugestão → campo preenchido, dropdown fecha
   - Salvar medicação → aparece na lista
   - Botão "Nova Medicação" fixo no rodapé visível
   - Remover paciente/med: pede confirmação inline (sem `confirm()` do browser)

2. **Login como Médico** → nova aba "Receitas" visível
   - Aba mostra lista de receitas vencidas/a vencer
   - Botão "Renovar hoje" → item some da lista otimisticamente
   - Botão "Editar data" → abre date picker inline, salva nova data
   - Botão "Ver todos os pacientes" → abre `MobileAgentsView` com todas as funções

3. **Login como Coordenação** → vê aba "Receitas" E aba "Agentes de Saúde" (HealthAgentsPanel original)

4. **Dark mode** → alternar modo escuro, verificar que todos os componentes novos respondem corretamente

- [ ] **Step 7: Commit final**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate MedRenovationView and MobileAgentsView into main navigation"
```

---

## Self-Review

**Spec coverage:**
- ✅ Aba "Receitas" para médico/coordenação → Task 4 + 5
- ✅ Painel de urgências com grupos vencido/a vencer → Task 4 `UrgencyPanel`
- ✅ Ações "Renovar hoje" e "Editar data" inline → Task 4 `AlertCard`
- ✅ Botão "Ver todos os pacientes" → Task 4 `UrgencyPanel` header
- ✅ MobileAgentsView para ACS → Task 3 + 5
- ✅ Touch targets ≥ 48px → todas as Tasks, uso de `py-3.5` e `py-4`
- ✅ Botão fixo no rodapé para adicionar → Task 3 `PatientsListView` e `MedsSection`
- ✅ Autocomplete com debounce 250ms → Task 2
- ✅ fromDb + fromList com dedup → Task 1 suggestions API
- ✅ Separador visual entre origens no dropdown → Task 2
- ✅ Dosagem auto-preenchida via regex → Task 2 `select()`
- ✅ Confirmação inline sem `confirm()` → Task 3 `PatientCard` e `MedCard`
- ✅ Dark mode em todos os componentes → verificado nas classes
- ✅ Estados de loading/error/empty → todos os componentes
- ✅ Coordenação mantém HealthAgentsPanel → Task 5 (condicional por perfil)

**Placeholder scan:** nenhum TBD ou TODO encontrado.

**Type consistency:**
- `MedAlert` definido em Task 4 e usado apenas em Task 4 — sem vazamento de tipos
- `MobileAgentsView` importado em Task 4 e Task 5 pelo mesmo path `@/components/MobileAgentsView`
- `MedRenovationView` importado em Task 5 pelo path `@/components/MedRenovationView`
- `MEDICATION_CLASS_LABELS` e `MedicationClass` de `@/types` — usados em Task 3 e Task 4, mesma fonte
