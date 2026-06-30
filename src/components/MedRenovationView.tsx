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
