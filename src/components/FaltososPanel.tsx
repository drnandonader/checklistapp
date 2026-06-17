'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { FaltosoPaciente, FALTOSO_CONDITION_LABELS, FaltosoCondition } from '@/types'
import { Upload, Loader2, AlertTriangle, CheckCircle2, Phone, MapPin, X } from 'lucide-react'

interface FaltososPanelProps {
  month: number
  year: number
  canImport: boolean // só coordenação pode importar
}

export function FaltososPanel({ month, year, canImport }: FaltososPanelProps) {
  const [faltosos, setFaltosos] = useState<FaltosoPaciente[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FaltosoCondition | 'todos'>('todos')
  const [showResolved, setShowResolved] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/faltosos?month=${month}&year=${year}`)
    if (res.ok) {
      const data = await res.json()
      setFaltosos(data.faltosos || [])
    }
    setLoading(false)
  }, [month, year])

  useEffect(() => { reload() }, [reload])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportMsg(null)

    try {
      const csvContent = await file.text()
      const res = await fetch('/api/faltosos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year, csvContent }),
      })
      const data = await res.json()

      if (!res.ok) {
        setImportMsg({ type: 'error', text: data.error || 'Erro ao importar arquivo' })
      } else {
        setImportMsg({
          type: 'success',
          text: `${data.imported} paciente(s) importado(s)${data.skipped > 0 ? `, ${data.skipped} linha(s) ignorada(s)` : ''}.`,
        })
        await reload()
      }
    } catch {
      setImportMsg({ type: 'error', text: 'Não foi possível ler o arquivo. Confirme que é um CSV válido.' })
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function toggleResolvido(id: string, current: boolean) {
    setFaltosos((prev) => prev.map((f) => (f.id === id ? { ...f, resolvido: !current } : f)))
    await fetch('/api/faltosos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, resolvido: !current }),
    })
  }

  const filtered = faltosos.filter((f) => {
    if (!showResolved && f.resolvido) return false
    if (filter !== 'todos' && f.condicao !== filter) return false
    return true
  })

  const conditionCounts = faltosos.reduce((acc, f) => {
    if (!f.resolvido) acc[f.condicao] = (acc[f.condicao] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-4">
      {/* Import button (só coordenação) */}
      {canImport && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-white">Importar lista de faltosos</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Envie o CSV exportado do PEC/e-SUS. Colunas aceitas: Nome, CNS, Telefone, Condição,
                Última consulta, Dias em atraso, Microárea, ACS.
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? 'Importando...' : 'Importar CSV'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {importMsg && (
            <div className={`mt-3 flex items-start gap-2 text-xs p-3 rounded-lg ${
              importMsg.type === 'success'
                ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
            }`}>
              {importMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              <span>{importMsg.text}</span>
              <button onClick={() => setImportMsg(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter('todos')}
          className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
            filter === 'todos'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
          }`}
        >
          Todos ({faltosos.filter((f) => !f.resolvido).length})
        </button>
        {(Object.keys(FALTOSO_CONDITION_LABELS) as FaltosoCondition[])
          .filter((c) => conditionCounts[c] > 0)
          .map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                filter === c
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
              }`}
            >
              {FALTOSO_CONDITION_LABELS[c]} ({conditionCounts[c]})
            </button>
          ))}
        <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 ml-auto cursor-pointer">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="rounded"
          />
          Mostrar resolvidos
        </label>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">
          {faltosos.length === 0
            ? 'Nenhuma lista de faltosos importada para este mês ainda.'
            : 'Nenhum paciente nesta categoria.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((f) => (
            <div
              key={f.id}
              className={`rounded-xl border p-3.5 transition-all ${
                f.resolvido
                  ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleResolvido(f.id, f.resolvido)}
                  className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    f.resolvido ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                  }`}
                >
                  {f.resolvido && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${f.resolvido ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                    {f.nome}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                      {FALTOSO_CONDITION_LABELS[f.condicao]}
                    </span>
                    {f.dias_em_atraso != null && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        f.dias_em_atraso > 180
                          ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400'
                          : 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {f.dias_em_atraso} dias em atraso
                      </span>
                    )}
                    {f.telefone && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Phone className="w-3 h-3" /> {f.telefone}
                      </span>
                    )}
                    {f.microarea && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <MapPin className="w-3 h-3" /> Microárea {f.microarea}
                        {f.acs_responsavel ? ` — ${f.acs_responsavel}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
