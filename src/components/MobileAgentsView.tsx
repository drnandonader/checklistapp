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
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Toque em &quot;+ Novo Paciente&quot; para adicionar.</p>
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
    setMeds((prev) => prev.filter((m) => m.id !== med.id))
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
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Toque em &quot;+ Nova Medicação&quot; para adicionar.</p>
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
