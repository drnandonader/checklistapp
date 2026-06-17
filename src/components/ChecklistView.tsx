'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProfessionalCategory, MONTHS, ItemCategory, ChecklistEntry } from '@/types'
import { fetchChecklistEntries } from '@/lib/storage'
import { getItemsByProfessional, groupItemsByCategory } from '@/data/checklist'
import { CategorySection } from './CategorySection'
import { ProgressBar } from './ProgressBar'
import { StatsCard } from './StatsCard'
import { Loader2 } from 'lucide-react'

interface ChecklistViewProps {
  month: number
  year: number
  professional: ProfessionalCategory
}

export function ChecklistView({ month, year, professional }: ChecklistViewProps) {
  const [entries, setEntries] = useState<Record<string, ChecklistEntry>>({})
  const [loading, setLoading] = useState(true)

  const items = getItemsByProfessional(professional)
  const grouped = groupItemsByCategory(items)

  const reload = useCallback(async () => {
    const data = await fetchChecklistEntries(month, year, professional)
    setEntries(data)
    setLoading(false)
  }, [month, year, professional])

  useEffect(() => {
    setLoading(true)
    reload()
  }, [reload])

  const done = items.filter((i) => entries[i.id]?.status === 'concluido').length
  const inProgress = items.filter((i) => entries[i.id]?.status === 'em_andamento').length
  const pending = items.length - done - inProgress
  const percent = items.length > 0 ? Math.round((done / items.length) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h2 className="text-base font-bold text-gray-800 dark:text-white">
            {MONTHS[month - 1]} {year}
          </h2>
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">{percent}% concluído</span>
        </div>
        <ProgressBar value={percent} className="mb-3" />
        <div className="grid grid-cols-3 gap-2">
          <StatsCard label="Concluídos" value={done} color="green" />
          <StatsCard label="Em andamento" value={inProgress} color="yellow" />
          <StatsCard label="Pendentes" value={pending} color="red" />
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg px-4 py-2.5">
        <p className="text-xs text-amber-700 dark:text-amber-400">
          <strong>📌 Lembrete:</strong> Indicadores devem ser revisados conforme normas vigentes do
          Ministério da Saúde (SISAB / Previne Brasil). Este checklist é de uso gerencial e organizacional.
        </p>
      </div>

      {(Object.keys(grouped) as ItemCategory[]).map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          items={grouped[cat]}
          entries={entries}
          month={month}
          year={year}
          professional={professional}
          onUpdate={reload}
        />
      ))}
    </div>
  )
}
