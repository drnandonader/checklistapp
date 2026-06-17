'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  ProfessionalCategory,
  PROFESSIONAL_LABELS,
  MONTHS,
  CATEGORY_LABELS,
  STATUS_LABELS,
  ItemCategory,
  ChecklistEntry,
} from '@/types'
import { fetchChecklistEntries } from '@/lib/storage'
import { getItemsByProfessional, groupItemsByCategory } from '@/data/checklist'
import { Printer, X, Loader2 } from 'lucide-react'

interface PrintReportProps {
  month: number
  year: number
  onClose: () => void
}

const ALL_PROFESSIONALS: ProfessionalCategory[] = ['medico', 'enfermeira', 'tecnico', 'acs', 'coordenacao']

interface ProfData {
  prof: ProfessionalCategory
  items: ReturnType<typeof getItemsByProfessional>
  grouped: ReturnType<typeof groupItemsByCategory>
  entries: Record<string, ChecklistEntry>
  done: number
  inProgress: number
  percent: number
}

export function PrintReport({ month, year, onClose }: PrintReportProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [profData, setProfData] = useState<ProfData[]>([])
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    setLoading(true)
    const results: ProfData[] = []
    for (const prof of ALL_PROFESSIONALS) {
      const items = getItemsByProfessional(prof)
      const grouped = groupItemsByCategory(items)
      const entries = await fetchChecklistEntries(month, year, prof)
      const done = items.filter((i) => entries[i.id]?.status === 'concluido').length
      const inProgress = items.filter((i) => entries[i.id]?.status === 'em_andamento').length
      const percent = items.length > 0 ? Math.round((done / items.length) * 100) : 0
      results.push({ prof, items, grouped, entries, done, inProgress, percent })
    }
    setProfData(results)
    setLoading(false)
  }, [month, year])

  useEffect(() => { loadAll() }, [loadAll])

  const totalItems = profData.reduce((a, p) => a + p.items.length, 0)
  const totalDone = profData.reduce((a, p) => a + p.done, 0)
  const totalPercent = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0
  const printedAt = new Date().toLocaleString('pt-BR')

  function handlePrint() {
    const el = printRef.current
    if (!el) return

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return

    const styles = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; background: white; padding: 0; font-size: 11px; }
        .page { max-width: 210mm; margin: 0 auto; padding: 12mm 14mm; }
        .report-header { border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
        .report-header h1 { font-size: 20px; font-weight: 800; color: #1e3a8a; }
        .report-header .sub { font-size: 11px; color: #6b7280; margin-top: 3px; }
        .report-header .meta { display: flex; gap: 20px; margin-top: 10px; font-size: 10px; color: #374151; }
        .report-header .meta span { background: #f1f5f9; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
        .global-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 20px; }
        .stat-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; text-align: center; }
        .stat-box .val { font-size: 22px; font-weight: 800; }
        .stat-box .lbl { font-size: 9px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
        .stat-box.blue .val { color: #2563eb; }
        .stat-box.green .val { color: #16a34a; }
        .stat-box.yellow .val { color: #d97706; }
        .stat-box.red .val { color: #dc2626; }
        .progress-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .progress-bar-outer { flex: 1; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
        .progress-bar-inner { height: 6px; border-radius: 3px; }
        .prog-green { background: #22c55e; }
        .prog-yellow { background: #f59e0b; }
        .prog-red { background: #ef4444; }
        .prof-section { margin-bottom: 24px; page-break-inside: avoid; }
        .prof-header { background: #eff6ff; border-left: 4px solid #2563eb; padding: 8px 12px; margin-bottom: 10px; border-radius: 0 6px 6px 0; display: flex; justify-content: space-between; align-items: center; }
        .prof-header h2 { font-size: 13px; font-weight: 700; color: #1e40af; }
        .prof-header .prof-stats { font-size: 10px; color: #374151; }
        .category-block { margin-bottom: 12px; }
        .category-title { font-size: 10px; font-weight: 700; color: #374151; background: #f9fafb; padding: 4px 8px; border-radius: 4px; margin-bottom: 6px; border: 1px solid #e5e7eb; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        th { background: #f1f5f9; font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 4px 8px; text-align: left; border: 1px solid #e2e8f0; color: #475569; }
        td { font-size: 10px; padding: 5px 8px; border: 1px solid #e2e8f0; vertical-align: top; }
        tr:nth-child(even) td { background: #fafafa; }
        .status-concluido { color: #16a34a; font-weight: 700; }
        .status-em_andamento { color: #d97706; font-weight: 700; }
        .status-pendente { color: #dc2626; font-weight: 700; }
        .done-yes { color: #16a34a; font-weight: 700; }
        .done-no { color: #9ca3af; }
        .footer-note { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 9px; color: #9ca3af; line-height: 1.5; }
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .prof-section { page-break-inside: avoid; }
          .category-block { page-break-inside: avoid; }
        }
      </style>
    `

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head><meta charset="UTF-8"><title>Relatório Mensal — ${MONTHS[month - 1]} ${year}</title>${styles}</head>
      <body>
        ${el.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); }
          }
        <\/script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-white">
              Relatório de Fechamento — {MONTHS[month - 1]} {year}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Visão completa de todas as categorias profissionais
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir / PDF
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto max-h-[75vh]">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : (
            <div ref={printRef} className="page">
              <div className="report-header">
                <h1>Checklist Boa Vista II</h1>
                <div className="sub">UBS Boa Vista II — Relatório Mensal de Fechamento</div>
                <div className="meta">
                  <span>📅 {MONTHS[month - 1]} {year}</span>
                  <span>🖨️ Emitido em: {printedAt}</span>
                  <span>📊 Conclusão geral: {totalPercent}%</span>
                </div>
              </div>

              <div className="global-stats">
                <div className="stat-box blue"><div className="val">{totalItems}</div><div className="lbl">Total de itens</div></div>
                <div className="stat-box green"><div className="val">{totalDone}</div><div className="lbl">Concluídos</div></div>
                <div className="stat-box yellow"><div className="val">{profData.reduce((a, p) => a + p.inProgress, 0)}</div><div className="lbl">Em andamento</div></div>
                <div className="stat-box red"><div className="val">{totalItems - totalDone - profData.reduce((a, p) => a + p.inProgress, 0)}</div><div className="lbl">Pendentes</div></div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Resumo por categoria profissional
                </div>
                {profData.map((p) => (
                  <div key={p.prof} className="progress-row">
                    <div style={{ width: '180px', fontSize: '10px', fontWeight: 600, color: '#374151' }}>
                      {PROFESSIONAL_LABELS[p.prof]}
                    </div>
                    <div className="progress-bar-outer">
                      <div
                        className={`progress-bar-inner ${p.percent >= 80 ? 'prog-green' : p.percent >= 50 ? 'prog-yellow' : 'prog-red'}`}
                        style={{ width: `${p.percent}%` }}
                      />
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 700, width: '40px', textAlign: 'right', color: p.percent >= 80 ? '#16a34a' : p.percent >= 50 ? '#d97706' : '#dc2626' }}>
                      {p.percent}%
                    </div>
                    <div style={{ fontSize: '10px', color: '#6b7280', width: '180px' }}>
                      {p.done} concluídos · {p.inProgress} andamento · {p.items.length - p.done - p.inProgress} pendentes
                    </div>
                  </div>
                ))}
              </div>

              {profData.map((p) => (
                <div key={p.prof} className="prof-section">
                  <div className="prof-header">
                    <h2>{PROFESSIONAL_LABELS[p.prof]}</h2>
                    <div className="prof-stats">{p.done}/{p.items.length} concluídos — {p.percent}%</div>
                  </div>

                  {(Object.keys(p.grouped) as ItemCategory[]).map((cat) => {
                    const catItems = p.grouped[cat]
                    return (
                      <div key={cat} className="category-block">
                        <div className="category-title">{CATEGORY_LABELS[cat]}</div>
                        <table>
                          <thead>
                            <tr>
                              <th style={{ width: '35%' }}>Item</th>
                              <th style={{ width: '12%' }}>Feito</th>
                              <th style={{ width: '12%' }}>Status</th>
                              <th style={{ width: '14%' }}>Quantidade</th>
                              <th style={{ width: '27%' }}>Observação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {catItems.map((item) => {
                              const entry = p.entries[item.id]
                              const status = entry?.status || 'pendente'
                              return (
                                <tr key={item.id}>
                                  <td>
                                    <div style={{ fontWeight: 600 }}>{item.title}</div>
                                    {item.indicador && (
                                      <div style={{ fontSize: '9px', color: '#2563eb', marginTop: '2px' }}>📌 {item.indicador}</div>
                                    )}
                                  </td>
                                  <td className={entry?.done ? 'done-yes' : 'done-no'}>{entry?.done ? '✓ Sim' : '— Não'}</td>
                                  <td className={`status-${status}`}>{STATUS_LABELS[status]}</td>
                                  <td>{entry?.quantity || '—'}</td>
                                  <td style={{ fontSize: '9px', color: '#374151' }}>{entry?.observation || '—'}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )
                  })}
                </div>
              ))}

              <div className="footer-note">
                <strong>⚕️ Aviso:</strong> Este relatório é uma ferramenta organizacional e gerencial para uso interno da equipe da UBS Boa Vista II.
                Não substitui os sistemas oficiais do Ministério da Saúde. Os indicadores devem ser revisados conforme as normas vigentes do SISAB,
                Previne Brasil e Cofinanciamento APS. Para dados oficiais, acesse o painel SISAB e o PEC e-SUS.
                &nbsp;|&nbsp; Gerado pelo Checklist Boa Vista II em {printedAt}.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
