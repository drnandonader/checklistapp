import { ChecklistEntry, ProfessionalCategory, ItemStatus } from '@/types'

// Esta lib substitui o antigo localStorage por chamadas à API,
// que por sua vez fala com o Supabase. A assinatura das funções
// foi mantida o mais parecida possível com a versão anterior para
// minimizar mudanças nos componentes — mas agora são assíncronas.

export async function fetchChecklistEntries(
  month: number,
  year: number,
  professional: ProfessionalCategory
): Promise<Record<string, ChecklistEntry>> {
  const res = await fetch(`/api/checklist?month=${month}&year=${year}&professional=${professional}`)
  if (!res.ok) return {}
  const data = await res.json()
  return data.entries || {}
}

export async function saveEntry(
  month: number,
  year: number,
  professional: ProfessionalCategory,
  itemId: string,
  entry: Partial<ChecklistEntry>
): Promise<boolean> {
  const res = await fetch('/api/checklist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month, year, professional, itemId, entry }),
  })
  return res.ok
}

export function exportToCSV(
  professional: string,
  entries: Record<string, ChecklistEntry>
): string {
  const rows: string[] = ['ItemID,Feito,Status,Quantidade,Observação,Atualizado em']
  for (const entry of Object.values(entries)) {
    rows.push(
      [
        entry.itemId,
        entry.done ? 'Sim' : 'Não',
        entry.status,
        entry.quantity,
        `"${entry.observation.replace(/"/g, "'")}"`,
        entry.updatedAt,
      ].join(',')
    )
  }
  return rows.join('\n')
}

export function computeStats(
  entries: Record<string, ChecklistEntry>,
  totalItems: number
): { done: number; inProgress: number; pending: number; percent: number } {
  const list = Object.values(entries)
  const done = list.filter((e) => e.status === 'concluido').length
  const inProgress = list.filter((e) => e.status === 'em_andamento').length
  const pending = totalItems - done - inProgress
  const percent = totalItems > 0 ? Math.round((done / totalItems) * 100) : 0
  return { done, inProgress, pending, percent }
}
