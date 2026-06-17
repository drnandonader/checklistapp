'use client'

import { useState } from 'react'
import { ChecklistItem, ChecklistEntry, ItemStatus, STATUS_LABELS, STATUS_COLORS } from '@/types'
import { saveEntry } from '@/lib/storage'
import { ChevronDown, ChevronUp, Tag, Loader2 } from 'lucide-react'

interface ChecklistItemCardProps {
  item: ChecklistItem
  entry: ChecklistEntry | undefined
  month: number
  year: number
  professional: string
  onUpdate: () => void
}

export function ChecklistItemCard({
  item, entry, month, year, professional, onUpdate,
}: ChecklistItemCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [obs, setObs] = useState(entry?.observation || '')
  const [qty, setQty] = useState(entry?.quantity || '')
  const [saving, setSaving] = useState(false)

  const currentStatus: ItemStatus = entry?.status || 'pendente'
  const isDone = entry?.done || false

  async function handleToggleDone() {
    setSaving(true)
    const newDone = !isDone
    await saveEntry(month, year, professional as never, item.id, {
      done: newDone,
      status: newDone ? 'concluido' : 'pendente',
      observation: obs,
      quantity: qty,
    })
    setSaving(false)
    onUpdate()
  }

  async function handleStatusChange(status: ItemStatus) {
    setSaving(true)
    await saveEntry(month, year, professional as never, item.id, {
      status,
      done: status === 'concluido',
      observation: obs,
      quantity: qty,
    })
    setSaving(false)
    onUpdate()
  }

  async function handleSaveObs() {
    setSaving(true)
    await saveEntry(month, year, professional as never, item.id, {
      observation: obs,
      quantity: qty,
      status: currentStatus,
      done: isDone,
    })
    setSaving(false)
    onUpdate()
  }

  const updatedAt = entry?.updatedAt
    ? new Date(entry.updatedAt).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className={`rounded-xl border transition-all ${
      isDone
        ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
        : currentStatus === 'em_andamento'
        ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900'
        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
    }`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={handleToggleDone}
            disabled={saving}
            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              isDone
                ? 'bg-green-500 border-green-500'
                : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
            }`}
            aria-label={isDone ? 'Desmarcar' : 'Marcar como feito'}
          >
            {isDone && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${isDone ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>
              {item.title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{item.description}</p>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <select
                value={currentStatus}
                onChange={(e) => handleStatusChange(e.target.value as ItemStatus)}
                disabled={saving}
                className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer ${STATUS_COLORS[currentStatus]}`}
              >
                {(Object.keys(STATUS_LABELS) as ItemStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>

              {item.indicador && (
                <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                  <Tag className="w-2.5 h-2.5" />
                  {item.indicador}
                </span>
              )}

              {saving && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
              {!saving && updatedAt && (
                <span className="text-xs text-gray-400 dark:text-gray-500">Atualizado: {updatedAt}</span>
              )}
            </div>
          </div>

          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 flex-shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Quantidade realizada</label>
              <input
                type="text"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                onBlur={handleSaveObs}
                placeholder="Ex: 12 pacientes"
                className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Observações</label>
              <textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                onBlur={handleSaveObs}
                rows={2}
                placeholder="Anotações, pendências..."
                className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 resize-none"
              />
            </div>
          </div>
          <button
            onClick={handleSaveObs}
            disabled={saving}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar observações'}
          </button>
        </div>
      )}
    </div>
  )
}
