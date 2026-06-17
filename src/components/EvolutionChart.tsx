'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { MonthlySnapshot, MONTHS_SHORT, PROFESSIONAL_LABELS, ProfessionalCategory } from '@/types'
import { Loader2, TrendingUp } from 'lucide-react'

const PROFESSIONAL_LINE_COLORS: Record<ProfessionalCategory, string> = {
  medico: '#2563eb',
  enfermeira: '#16a34a',
  tecnico: '#9333ea',
  acs: '#ea580c',
  coordenacao: '#475569',
}

interface ChartPoint {
  label: string
  [key: string]: string | number
}

export function EvolutionChart() {
  const [snapshots, setSnapshots] = useState<MonthlySnapshot[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/snapshots?months=6')
    if (res.ok) {
      const data = await res.json()
      setSnapshots(data.snapshots || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      </div>
    )
  }

  if (snapshots.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 text-center">
        <TrendingUp className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ainda não há histórico de meses fechados. Use o botão &quot;Fechar mês&quot; no painel da
          coordenação para começar a registrar a evolução.
        </p>
      </div>
    )
  }

  // Monta pontos de gráfico: um por mês/ano, com uma série por profissional
  const byMonth = new Map<string, ChartPoint>()
  const professionalsPresent = new Set<ProfessionalCategory>()

  for (const s of snapshots) {
    const key = `${s.year}-${String(s.month).padStart(2, '0')}`
    const label = `${MONTHS_SHORT[s.month - 1]}/${String(s.year).slice(2)}`
    if (!byMonth.has(key)) byMonth.set(key, { label })
    byMonth.get(key)![s.professional] = s.percent
    professionalsPresent.add(s.professional as ProfessionalCategory)
  }

  const chartData = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, point]) => point)

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Evolução mensal por categoria</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Percentual de conclusão do checklist nos últimos meses fechados
      </p>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            formatter={(value: number) => [`${value}%`, '']}
          />
          <Legend
            formatter={(value) => PROFESSIONAL_LABELS[value as ProfessionalCategory] || value}
            wrapperStyle={{ fontSize: 11 }}
          />
          {Array.from(professionalsPresent).map((prof) => (
            <Line
              key={prof}
              type="monotone"
              dataKey={prof}
              stroke={PROFESSIONAL_LINE_COLORS[prof]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
