'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Check, Home, Loader2, Pencil, Trash2, X } from 'lucide-react'
import { HealthAgent, WeeklyHomeVisit } from '@/types'

export function WeeklyHomeVisitsPanel() {
  const [visits, setVisits] = useState<WeeklyHomeVisit[]>([])
  const [agents, setAgents] = useState<HealthAgent[]>([])
  const [visitDate, setVisitDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingSlot, setEditingSlot] = useState<number | null>(null)
  const [patientName, setPatientName] = useState('')
  const [agentId, setAgentId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [visitsRes, agentsRes] = await Promise.all([
        fetch('/api/weekly-home-visits'),
        fetch('/api/health-agents'),
      ])
      const visitsData = await visitsRes.json()
      const agentsData = await agentsRes.json()
      if (!visitsRes.ok) throw new Error(visitsData.error || 'Erro ao carregar visitas')
      if (!agentsRes.ok) throw new Error(agentsData.error || 'Erro ao carregar agentes')
      setVisits(visitsData.visits || [])
      setVisitDate(visitsData.visitDate)
      setAgents(agentsData.agents || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar as visitas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function startEditing(slot: number) {
    const visit = visits.find((item) => item.slot_number === slot)
    setEditingSlot(slot)
    setPatientName(visit?.patient_name || '')
    setAgentId(visit?.agent_id || '')
    setNotes(visit?.notes || '')
    setError(null)
  }

  function cancelEditing() {
    setEditingSlot(null)
    setPatientName('')
    setAgentId('')
    setNotes('')
  }

  async function save() {
    if (!editingSlot || !patientName.trim() || !agentId) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/weekly-home-visits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_number: editingSlot,
          patient_name: patientName,
          agent_id: agentId,
          notes,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar a visita')
      cancelEditing()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function remove(slot: number) {
    if (!confirm('Liberar esta vaga de visita domiciliar?')) return
    const response = await fetch(`/api/weekly-home-visits?slot=${slot}`, { method: 'DELETE' })
    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'Não foi possível liberar a vaga')
      return
    }
    await load()
  }

  const formattedDate = visitDate
    ? new Date(`${visitDate}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
    : ''

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 p-5 text-white">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/80">
          <Home className="h-4 w-4" /> Visitas domiciliares
        </div>
        <h2 className="mt-2 text-xl font-bold">Agenda da semana</h2>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
          <CalendarDays className="h-4 w-4" /> Sexta-feira, {formattedDate}
        </p>
        <p className="mt-2 text-xs text-white/70">Quatro vagas compartilhadas. Uma nova agenda começa automaticamente todo domingo.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-blue-500" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((slot) => {
            const visit = visits.find((item) => item.slot_number === slot)
            const editing = editingSlot === slot
            return (
              <div key={slot} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Visita {slot}</span>
                  {visit && !editing && (
                    <div className="flex gap-1">
                      <button onClick={() => startEditing(slot)} className="p-1.5 text-gray-400 hover:text-blue-600" title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove(slot)} className="p-1.5 text-gray-400 hover:text-red-600" title="Liberar vaga">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {editing ? (
                  <div className="space-y-2">
                    <input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Nome do paciente" autoFocus
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
                    <select value={agentId} onChange={(e) => setAgentId(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
                      <option value="">Agente responsável</option>
                      {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                    </select>
                    <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observação ou endereço (opcional)"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
                    <div className="flex gap-2">
                      <button onClick={save} disabled={saving || !patientName.trim() || !agentId}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white disabled:opacity-50">
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Salvar
                      </button>
                      <button onClick={cancelEditing} className="rounded-lg border border-gray-200 px-3 dark:border-gray-700"><X className="h-4 w-4" /></button>
                    </div>
                  </div>
                ) : visit ? (
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{visit.patient_name}</p>
                    <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">{visit.agent?.name || 'Agente não encontrado'}</p>
                    {visit.notes && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{visit.notes}</p>}
                  </div>
                ) : (
                  <button onClick={() => startEditing(slot)}
                    className="flex min-h-24 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-emerald-300 hover:text-emerald-600 dark:border-gray-700">
                    + Agendar visita
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
