'use client'

import { ChecklistItem, ChecklistEntry, CATEGORY_LABELS, ItemCategory } from '@/types'
import { ChecklistItemCard } from './ChecklistItemCard'
import { ProgressBar } from './ProgressBar'

interface CategorySectionProps {
  category: ItemCategory
  items: ChecklistItem[]
  entries: Record<string, ChecklistEntry>
  month: number
  year: number
  professional: string
  onUpdate: () => void
}

export function CategorySection({ category, items, entries, month, year, professional, onUpdate }: CategorySectionProps) {
  const done = items.filter((i) => entries[i.id]?.status === 'concluido').length
  const percent = Math.round((done / items.length) * 100)

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">
          {CATEGORY_LABELS[category]}
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{done}/{items.length}</span>
          <div className="w-20"><ProgressBar value={percent} showLabel={false} /></div>
          <span className="font-semibold">{percent}%</span>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <ChecklistItemCard
            key={item.id}
            item={item}
            entry={entries[item.id]}
            month={month}
            year={year}
            professional={professional}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  )
}
