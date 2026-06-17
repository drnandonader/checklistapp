'use client'

import { useState, useEffect, useCallback } from 'react'
import { PREVINE_INDICATORS, PrevineIndicatorId, PrevineIndicatorScore } from '@/types'
import { Loader2, Target, Pencil, X, Check, Info } from 'lucide-react'

interface PrevineScoreboardProps {
  month: number
  year: number
  canEditTargets: boolean // só coordenação
}

const STATUS_STYLES = {
  verde: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900',
  amarelo: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900',
  vermelho: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900',
}

const STATUS_DOT = {
  verde: 'bg-green-500',
  amarelo: 'bg-yellow-500',
  vermelho: 'bg-red-500',
}

const STATUS_TEXT = {
  verde: 'text-green-700 dark:text-green-400',
  amarelo: 'text-yellow-700 dark:text-yellow-400',
  vermelho: 'text-red-700 dark:text-red-400',
}

export function PrevineScoreboard({ month, year, canEditTargets }: PrevineScoreboardProps) {
  const [scores, setScores] = useState<PrevineIndicatorScore[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<PrevineIndicatorId | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editQuad, setEditQuad] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/previne-score?month=${month}&year=${year}`)
    if (res.ok) {
      const data = await res.json()
      setScores(data.scores || [])
    }
    setLoading(false)
  }, [month, year])

  useEffect(() => { load() }, [load])

  function startEdit(score: PrevineIndicatorScore) {
    setEditingId(score.id)
    setEditValue(score.target != null ? String(score.target) : '')
    setEditQuad('')
  }

  async function saveTarget() {
    if (!editingId) return
    setSaving(true)
    await fetch('/api/previne-targets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingId,
        target_percent: Number(editValue) || 0,
        quadrimestre: editQuad,
      }),
    })
    setSaving(false)
    setEditingId(null)
    await load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Placar Previne Brasil</h3>
      </div>

      <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg px-3 py-2 mb-4">
        <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          <strong>Estimativa interna de processo</strong> — calculada a partir das ações deste checklist
          marcadas como concluídas. Não é o número oficial do indicador (que depende dos registros reais
          no PEC/SISAB). Para o resultado oficial, consulte o painel do Ministério da Saúde.
        </p>
      </div>

      <div className="space-y-2.5">
        {PREVINE_INDICATORS.map((meta) => {
          const score = scores.find((s) => s.id === meta.id)
          if (!score) return null
          const isEditing = editingId === meta.id

          return (
            <div key={meta.id} className={`rounded-lg border p-3 ${STATUS_STYLES[score.status]}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[score.status]}`} />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                      {meta.numero}. {meta.titulo}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{meta.resumo}</p>
                </div>

                {canEditTargets && !isEditing && (
                  <button
                    onClick={() => startEdit(score)}
                    className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex-shrink-0 p-1"
                    title="Editar meta vigente"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="Meta %"
                      className="w-20 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-2 py-1"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                  <input
                    type="text"
                    value={editQuad}
                    onChange={(e) => setEditQuad(e.target.value)}
                    placeholder="Ex: Q1/2026"
                    className="w-24 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-2 py-1"
                  />
                  <button
                    onClick={saveTarget}
                    disabled={saving}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-2.5 py-1 rounded-lg text-xs font-medium"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className={`font-bold ${STATUS_TEXT[score.status]}`}>
                    {score.processPercent}% das ações
                  </span>
                  <span className="text-gray-400">({score.actionsDone}/{score.actionsTotal})</span>
                  {score.target != null ? (
                    <span className="text-gray-500 dark:text-gray-400">meta: {score.target}%</span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-600 italic">meta não configurada</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
