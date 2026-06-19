'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ProfessionalCategory,
  PROFESSIONAL_LABELS,
  MONTHS,
  ChecklistEntry,
} from '@/types'
import { fetchChecklistEntries, exportToCSV } from '@/lib/storage'
import { getItemsByProfessional } from '@/data/checklist'
import { ProgressBar } from './ProgressBar'
import { StatsCard } from './StatsCard'
import { EvolutionChart } from './EvolutionChart'
import { PrevineScoreboard } from './PrevineScoreboard'
import { FaltososPanel } from './FaltososPanel'
import { HealthAgentsPanel } from './HealthAgentsPanel'
import { WeeklyHomeVisitsPanel } from './WeeklyHomeVisitsPanel'
import { Download, Loader2, Lock, Mail, CheckCircle2, X } from 'lucide-react'

interface CoordinationPanelProps {
  month: number
  year: number
}

const PROFESSIONALS: ProfessionalCategory[] = ['medico', 'enfermeira', 'tecnico', 'acs']

interface ProfStat {
  prof: ProfessionalCategory
  done: number
  inProgress: number
  percent: number
  pendingTitles: string[]
  totalItems: number
  entries: Record<string, ChecklistEntry>
}

export function CoordinationPanel({ month, year }: CoordinationPanelProps) {
  const [stats, setStats] = useState<ProfStat[]>([])
  const [loading, setLoading] = useState(true)
  const [closingMonth, setClosingMonth] = useState(false)
  const [closeMsg, setCloseMsg] = useState<string | null>(null)
  const [alertProf, setAlertProf] = useState<ProfessionalCategory | null>(null)
  const [alertText, setAlertText] = useState('')
  const [sendingAlert, setSendingAlert] = useState(false)
  const [alertResult, setAlertResult] = useState<string | null>(null)
  const [tab, setTab] = useState<'geral' | 'visitas' | 'faltosos' | 'agentes'>('geral')

  const loadStats = useCallback(async () => {
    setLoading(true)
    const results: ProfStat[] = []
    for (const prof of PROFESSIONALS) {
      const items = getItemsByProfessional(prof)
      const entries = await fetchChecklistEntries(month, year, prof)
      const done = items.filter((i) => entries[i.id]?.status === 'concluido').length
      const inProgress = items.filter((i) => entries[i.id]?.status === 'em_andamento').length
      const percent = items.length > 0 ? Math.round((done / items.length) * 100) : 0
      const pendingTitles = items
        .filter((i) => !entries[i.id] || entries[i.id].status === 'pendente')
        .map((i) => i.title)
      results.push({ prof, done, inProgress, percent, pendingTitles, totalItems: items.length, entries })
    }
    setStats(results)
    setLoading(false)
  }, [month, year])

  useEffect(() => { loadStats() }, [loadStats])

  const totalItems = stats.reduce((a, s) => a + s.totalItems, 0)
  const totalDone = stats.reduce((a, s) => a + s.done, 0)
  const totalPercent = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0

  function handleExport() {
    const allEntries: Record<string, ChecklistEntry> = {}
    for (const s of stats) Object.assign(allEntries, s.entries)
    const csv = exportToCSV('todos', allEntries)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `checklist_boavista2_${MONTHS[month - 1]}_${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleCloseMonth() {
    setClosingMonth(true)
    setCloseMsg(null)
    const res = await fetch('/api/snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year }),
    })
    const data = await res.json()
    setClosingMonth(false)
    setCloseMsg(res.ok ? 'Mês fechado! O snapshot foi salvo no histórico de evolução.' : data.error || 'Erro ao fechar o mês.')
  }

  async function handleSendAlert() {
    if (!alertProf || !alertText.trim()) return
    setSendingAlert(true)
    setAlertResult(null)
    const res = await fetch('/api/notifications/critical-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ professional: alertProf, message: alertText.trim() }),
    })
    const data = await res.json()
    setSendingAlert(false)
    if (res.ok) {
      setAlertResult(`Enviado para: ${data.sentTo.join(', ') || 'nenhum destinatário ativo'}`)
      setAlertText('')
    } else {
      setAlertResult(data.error || 'Erro ao enviar alerta')
    }
  }

  const criticalPending = stats.flatMap((s) =>
    s.pendingTitles.slice(0, 2).map((title) => ({ title, prof: PROFESSIONAL_LABELS[s.prof] }))
  ).slice(0, 8)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">
            Painel Geral — {MONTHS[month - 1]} {year}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Visão consolidada de todas as categorias profissionais</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            onClick={handleCloseMonth}
            disabled={closingMonth}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white px-3 py-2 rounded-lg transition-colors text-xs font-medium"
          >
            {closingMonth ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
            Fechar mês
          </button>
        </div>
      </div>

      {closeMsg && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg px-4 py-2.5 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
          {closeMsg}
          <button onClick={() => setCloseMsg(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setTab('visitas')}
          className={`text-sm font-medium px-3 py-2 border-b-2 transition-colors ${
            tab === 'visitas' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400'
          }`}
        >
          Visitas da Semana
        </button>
        <button
          onClick={() => setTab('geral')}
          className={`text-sm font-medium px-3 py-2 border-b-2 transition-colors ${
            tab === 'geral' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400'
          }`}
        >
          Visão Geral
        </button>
        <button
          onClick={() => setTab('faltosos')}
          className={`text-sm font-medium px-3 py-2 border-b-2 transition-colors ${
            tab === 'faltosos' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400'
          }`}
        >
          Faltosos
        </button>
        <button
          onClick={() => setTab('agentes')}
          className={`text-sm font-medium px-3 py-2 border-b-2 transition-colors ${
            tab === 'agentes' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400'
          }`}
        >
          Agentes de Saúde
        </button>
      </div>

      {tab === 'visitas' ? (
        <WeeklyHomeVisitsPanel />
      ) : tab === 'faltosos' ? (
        <FaltososPanel month={month} year={year} canImport={true} />
      ) : tab === 'agentes' ? (
        <HealthAgentsPanel canManageAgents={true} />
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatsCard label="Total de itens" value={totalItems} color="slate" />
            <StatsCard label="Concluídos" value={totalDone} color="green" />
            <StatsCard label="Pendentes" value={totalItems - totalDone} color="red" />
            <StatsCard label="Conclusão geral" value={`${totalPercent}%`} color="blue" />
          </div>

          <PrevineScoreboard month={month} year={year} canEditTargets={true} />

          <EvolutionChart />

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">Progresso por categoria profissional</h3>
            <div className="space-y-4">
              {stats.map((s) => (
                <div key={s.prof}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {PROFESSIONAL_LABELS[s.prof]}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {s.done} concluídos · {s.inProgress} andamento · {s.pendingTitles.length} pendentes
                      </span>
                      <button
                        onClick={() => { setAlertProf(s.prof); setAlertResult(null) }}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Mail className="w-3 h-3" /> Alertar
                      </button>
                    </div>
                  </div>
                  <ProgressBar value={s.percent} />
                </div>
              ))}
            </div>
          </div>

          {criticalPending.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-5">
              <h3 className="text-sm font-bold text-red-700 dark:text-red-400 mb-3">⚠️ Itens críticos pendentes</h3>
              <ul className="space-y-2">
                {criticalPending.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-red-400 mt-0.5">•</span>
                    <div>
                      <span className="font-medium text-red-800 dark:text-red-300">{item.title}</span>
                      <span className="text-red-500 ml-2 text-xs">— {item.prof}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              <strong>⚕️ Nota:</strong> Este checklist é uma ferramenta de apoio gerencial. Os indicadores
              devem ser revisados conforme normas vigentes do Ministério da Saúde (SISAB / Previne Brasil /
              Cofinanciamento APS). Para dados oficiais, acesse o painel do SISAB e o PEC e-SUS.
            </p>
          </div>
        </>
      )}

      {/* Modal de alerta */}
      {alertProf && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 w-full max-w-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white">
                Alertar {PROFESSIONAL_LABELS[alertProf]}
              </h3>
              <button onClick={() => setAlertProf(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <textarea
              value={alertText}
              onChange={(e) => setAlertText(e.target.value)}
              rows={3}
              placeholder="Ex: Faltam 3 dias para o fechamento e o checklist está em 40%. Por favor, priorizem as pendências."
              className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
            {alertResult && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {alertResult}
              </p>
            )}
            <button
              onClick={handleSendAlert}
              disabled={sendingAlert || !alertText.trim()}
              className="mt-3 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
            >
              {sendingAlert ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Enviar por e-mail
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
