'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  HealthAgent, AgentPatient, ControlledMedication, MedicationClass,
  MEDICATION_CLASS_LABELS, MEDICATION_CLASS_COLORS,
  RENEWAL_URGENCY_LABELS, RENEWAL_URGENCY_COLORS,
  computeRenewalUrgency,
} from '@/types'
import {
  Users, UserPlus, Pill, Plus, X, Loader2, ChevronRight, ArrowLeft,
  Trash2, AlertTriangle, Pencil, Check,
} from 'lucide-react'

interface HealthAgentsPanelProps {
  canManageAgents: boolean
}

type ViewLevel = 'agents' | 'patients' | 'medications'

export function HealthAgentsPanel({ canManageAgents }: HealthAgentsPanelProps) {
  const [agents, setAgents] = useState<HealthAgent[]>([])
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<HealthAgent | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<AgentPatient | null>(null)
  const [view, setView] = useState<ViewLevel>('agents')

  const [newAgentName, setNewAgentName] = useState('')
  const [addingAgent, setAddingAgent] = useState(false)
  const [showAddAgent, setShowAddAgent] = useState(false)
  const [agentError, setAgentError] = useState<string | null>(null)

  const loadAgents = useCallback(async () => {
    setLoadingAgents(true)
    setAgentError(null)
    try {
      const res = await fetch('/api/health-agents')
      const data = await res.json()
      if (!res.ok) {
        setAgentError(data.error || 'Não foi possível carregar os agentes.')
      } else {
        setAgents(data.agents || [])
      }
    } catch {
      setAgentError('Falha de conexão ao carregar os agentes.')
    }
    setLoadingAgents(false)
  }, [])

  useEffect(() => { loadAgents() }, [loadAgents])

  async function handleAddAgent() {
    if (!newAgentName.trim()) return
    setAgentError(null)
    setAddingAgent(true)
    try {
      const res = await fetch('/api/health-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAgentName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAgentError(data.error || 'Não foi possível cadastrar o agente.')
        return
      }
      setNewAgentName('')
      setShowAddAgent(false)
      await loadAgents()
    } catch {
      setAgentError('Falha de conexão ao cadastrar o agente.')
    } finally {
      setAddingAgent(false)
    }
  }

  async function handleRemoveAgent(id: string) {
    if (!confirm('Remover este agente de saúde? Os pacientes cadastrados ficarão sem agente vinculado.')) return
    await fetch(`/api/health-agents?id=${id}`, { method: 'DELETE' })
    await loadAgents()
    if (selectedAgent?.id === id) {
      setSelectedAgent(null)
      setView('agents')
    }
  }

  function openAgent(agent: HealthAgent) {
    setSelectedAgent(agent)
    setSelectedPatient(null)
    setView('patients')
  }

  function openPatient(patient: AgentPatient) {
    setSelectedPatient(patient)
    setView('medications')
  }

  function goBack() {
    if (view === 'medications') {
      setSelectedPatient(null)
      setView('patients')
    } else if (view === 'patients') {
      setSelectedAgent(null)
      setView('agents')
    }
  }

  return (
    <div className="space-y-4">
      {view !== 'agents' && (
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          {view === 'medications' ? `Voltar para ${selectedAgent?.name}` : 'Voltar para Agentes'}
        </button>
      )}

      {view === 'agents' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Agentes de Saúde
            </h2>
            {canManageAgents && (
              <button
                onClick={() => setShowAddAgent((v) => !v)}
                className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Novo agente
              </button>
            )}
          </div>

          {showAddAgent && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAgent()}
                  placeholder="Nome do agente de saúde"
                  autoFocus
                  className="flex-1 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button
                  onClick={handleAddAgent}
                  disabled={addingAgent || !newAgentName.trim()}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-2 rounded-lg text-sm font-medium"
                >
                  {addingAgent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => { setShowAddAgent(false); setNewAgentName('') }}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {agentError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {agentError}
            </div>
          )}

          {loadingAgents ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
              <Users className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {canManageAgents
                  ? 'Nenhum agente cadastrado ainda. Use o botão acima para adicionar.'
                  : 'Nenhum agente cadastrado ainda. Peça à coordenação para cadastrar.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-800 transition-colors cursor-pointer group"
                  onClick={() => openAgent(agent)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 flex items-center justify-center font-bold text-sm">
                      {agent.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{agent.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManageAgents && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveAgent(agent.id) }}
                        className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'patients' && selectedAgent && (
        <PatientsListView agent={selectedAgent} onOpenPatient={openPatient} />
      )}

      {view === 'medications' && selectedPatient && (
        <MedicationsView patient={selectedPatient} />
      )}
    </div>
  )
}

function PatientsListView({
  agent, onOpenPatient,
}: { agent: HealthAgent; onOpenPatient: (p: AgentPatient) => void }) {
  const [patients, setPatients] = useState<AgentPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [adding, setAdding] = useState(false)
  const [medCounts, setMedCounts] = useState<Record<string, { total: number; urgent: number }>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/agent-patients?agent_id=${agent.id}`)
    if (res.ok) {
      const data = await res.json()
      const list: AgentPatient[] = data.patients || []
      setPatients(list)

      const counts: Record<string, { total: number; urgent: number }> = {}
      await Promise.all(
        list.map(async (p) => {
          const medsRes = await fetch(`/api/controlled-medications?patient_id=${p.id}`)
          if (medsRes.ok) {
            const medsData = await medsRes.json()
            const meds: ControlledMedication[] = medsData.medications || []
            const urgent = meds.filter((m) => {
              const { urgency } = computeRenewalUrgency(m)
              return urgency === 'atencao' || urgency === 'vencido'
            }).length
            counts[p.id] = { total: meds.length, urgent }
          }
        })
      )
      setMedCounts(counts)
    }
    setLoading(false)
  }, [agent.id])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!newName.trim()) return
    setAdding(true)
    const res = await fetch('/api/agent-patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agent.id, name: newName.trim(), notes: newNotes.trim() }),
    })
    setAdding(false)
    if (res.ok) {
      setNewName('')
      setNewNotes('')
      setShowAdd(false)
      await load()
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('Remover este paciente da lista?')) return
    await fetch(`/api/agent-patients?id=${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-800 dark:text-white">
          Pacientes de <span className="text-orange-600 dark:text-orange-400">{agent.name}</span>
        </h2>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Novo paciente
        </button>
      </div>

      {showAdd && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-3 space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do paciente"
            autoFocus
            className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <input
            type="text"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Observações (endereço, condição, etc — opcional)"
            className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
            >
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Adicionar
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewName(''); setNewNotes('') }}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          <UserPlus className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum paciente cadastrado ainda para este agente.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {patients.map((p) => {
            const counts = medCounts[p.id]
            return (
              <div
                key={p.id}
                className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-800 transition-colors cursor-pointer group"
                onClick={() => onOpenPatient(p)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{p.name}</p>
                  {p.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.notes}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Pill className="w-3 h-3" /> {counts?.total ?? 0} medicação(ões)
                    </span>
                    {(counts?.urgent ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-3 h-3" /> {counts!.urgent} a renovar
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(p.id) }}
                    className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MedicationsView({ patient }: { patient: AgentPatient }) {
  const [meds, setMeds] = useState<ControlledMedication[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/controlled-medications?patient_id=${patient.id}`)
    if (res.ok) {
      const data = await res.json()
      setMeds(data.medications || [])
    }
    setLoading(false)
  }, [patient.id])

  useEffect(() => { load() }, [load])

  async function handleRemove(id: string) {
    if (!confirm('Remover esta medicação da lista?')) return
    await fetch(`/api/controlled-medications?id=${id}`, { method: 'DELETE' })
    await load()
  }

  async function handleRenew(med: ControlledMedication) {
    const today = new Date().toISOString().slice(0, 10)
    await fetch('/api/controlled-medications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: med.id,
        last_renewed_at: today,
        prescription_end_date: null,
      }),
    })
    await load()
  }

  const urgencyOrder = { vencido: 0, atencao: 1, ok: 2, indefinido: 3 }
  const sortedMeds = [...meds].sort((a, b) => {
    const ua = computeRenewalUrgency(a).urgency
    const ub = computeRenewalUrgency(b).urgency
    return urgencyOrder[ua] - urgencyOrder[ub]
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-800 dark:text-white">
          Medicações de <span className="text-blue-600 dark:text-blue-400">{patient.name}</span>
        </h2>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova medicação
        </button>
      </div>

      {patient.notes && (
        <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 mb-3">
          📝 {patient.notes}
        </p>
      )}

      {showAdd && (
        <MedicationForm
          patientId={patient.id}
          onSaved={() => { setShowAdd(false); load() }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        </div>
      ) : sortedMeds.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          <Pill className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma medicação controlada cadastrada ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedMeds.map((med) => {
            if (editingId === med.id) {
              return (
                <MedicationForm
                  key={med.id}
                  patientId={patient.id}
                  existing={med}
                  onSaved={() => { setEditingId(null); load() }}
                  onCancel={() => setEditingId(null)}
                />
              )
            }

            const { urgency, dueDate, daysRemaining } = computeRenewalUrgency(med)

            return (
              <div key={med.id} className={`rounded-xl border p-4 ${RENEWAL_URGENCY_COLORS[urgency]}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{med.name}</p>
                      {med.dosage && <span className="text-xs text-gray-500 dark:text-gray-400">{med.dosage}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MEDICATION_CLASS_COLORS[med.med_class]}`}>
                        {MEDICATION_CLASS_LABELS[med.med_class]}
                      </span>
                    </div>
                    {med.posology && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">📋 {med.posology}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${RENEWAL_URGENCY_COLORS[urgency]}`}>
                        {RENEWAL_URGENCY_LABELS[urgency]}
                      </span>
                      {dueDate && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {urgency === 'vencido'
                            ? `Venceu há ${Math.abs(daysRemaining!)} dia(s)`
                            : `Vence em ${daysRemaining} dia(s)`}
                          {' · '}
                          {new Date(dueDate).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                    {med.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">📝 {med.notes}</p>}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditingId(med.id)}
                      className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1.5"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemove(med.id)}
                      className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1.5"
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {(urgency === 'atencao' || urgency === 'vencido') && (
                  <button
                    onClick={() => handleRenew(med)}
                    className="mt-3 w-full bg-white dark:bg-gray-800 border border-current text-xs font-semibold py-1.5 rounded-lg hover:bg-opacity-80 transition-colors"
                  >
                    ✓ Marcar como renovada hoje
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MedicationForm({
  patientId, existing, onSaved, onCancel,
}: {
  patientId: string
  existing?: ControlledMedication
  onSaved: () => void
  onCancel: () => void
}) {
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

    if (existing) {
      await fetch('/api/controlled-medications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: existing.id, ...payload }),
      })
    } else {
      await fetch('/api/controlled-medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="bg-white dark:bg-gray-900 border-2 border-blue-200 dark:border-blue-900 rounded-xl p-4 mb-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nome do medicamento *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Clonazepam"
            autoFocus
            className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Dosagem</label>
          <input
            type="text"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="Ex: 2mg"
            className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Posologia</label>
          <input
            type="text"
            value={posology}
            onChange={(e) => setPosology(e.target.value)}
            placeholder="Ex: 1x ao dia, à noite"
            className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Classe</label>
          <select
            value={medClass}
            onChange={(e) => setMedClass(e.target.value as MedicationClass)}
            className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {(Object.keys(MEDICATION_CLASS_LABELS) as MedicationClass[]).map((c) => (
              <option key={c} value={c}>{MEDICATION_CLASS_LABELS[c]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
          Controle de vencimento da receita
        </label>
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setDateMode('fixed')}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
              dateMode === 'fixed'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            }`}
          >
            Data exata de término
          </button>
          <button
            onClick={() => setDateMode('duration')}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
              dateMode === 'duration'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            }`}
          >
            Duração padrão (dias)
          </button>
        </div>

        {dateMode === 'fixed' ? (
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Última renovação</label>
              <input
                type="date"
                value={lastRenewed}
                onChange={(e) => setLastRenewed(e.target.value)}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Duração (dias)</label>
              <input
                type="number"
                min={1}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="30"
                className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Observações</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anotações sobre essa medicação..."
          className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {existing ? 'Salvar alterações' : 'Adicionar medicação'}
        </button>
        <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">
          Cancelar
        </button>
      </div>
    </div>
  )
}
