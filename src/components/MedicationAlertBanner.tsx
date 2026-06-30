'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, X, Pill, ChevronRight } from 'lucide-react'

interface MedAlert {
  patient_id: string
  patient_name: string
  agent_name: string
  med_id: string
  med_name: string
  days_remaining: number
  due_date: string
  is_expired: boolean
}

interface MedicationAlertBannerProps {
  onGoToAgents?: () => void
}

export function MedicationAlertBanner({ onGoToAgents }: MedicationAlertBannerProps) {
  const [alerts, setAlerts] = useState<MedAlert[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const key = `med_alert_dismissed_${new Date().toISOString().slice(0, 10)}`
    if (sessionStorage.getItem(key)) {
      setDismissed(true)
      return
    }

    fetch('/api/controlled-medications/expiring-soon')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.alerts) && data.alerts.length > 0) {
          setAlerts(data.alerts)
        }
      })
      .catch(() => {})
  }, [])

  function dismiss() {
    const key = `med_alert_dismissed_${new Date().toISOString().slice(0, 10)}`
    sessionStorage.setItem(key, '1')
    setDismissed(true)
  }

  if (dismissed || alerts.length === 0) return null

  const expired = alerts.filter((a) => a.is_expired)
  const expiring = alerts.filter((a) => !a.is_expired)
  const hasExpired = expired.length > 0

  return (
    <div
      className={`rounded-xl border p-4 ${
        hasExpired
          ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800'
          : 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-800'
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            hasExpired ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
          }`}
        />

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${
            hasExpired ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'
          }`}>
            {hasExpired && expired.length > 0
              ? `${expired.length} receita(s) vencida(s)${expiring.length > 0 ? ` e ${expiring.length} a vencer` : ''}`
              : `${expiring.length} receita(s) a vencer em até 7 dias`}
          </p>

          <p className={`text-xs mt-0.5 ${
            hasExpired ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
          }`}>
            Acesse Agentes de Saúde para renovar as receitas.
          </p>

          {expanded && (
            <ul className="mt-2 space-y-1">
              {alerts.slice(0, 6).map((a) => (
                <li key={a.med_id} className="flex items-center gap-2">
                  <Pill className={`w-3 h-3 flex-shrink-0 ${
                    a.is_expired ? 'text-red-500 dark:text-red-400' : 'text-yellow-500 dark:text-yellow-400'
                  }`} />
                  <span className={`text-xs ${
                    hasExpired ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'
                  }`}>
                    <strong>{a.patient_name}</strong> — {a.med_name}{' '}
                    <span className="opacity-75">
                      ({a.is_expired
                        ? `venceu há ${Math.abs(a.days_remaining)} dia(s)`
                        : `vence em ${a.days_remaining} dia(s)`})
                    </span>
                  </span>
                </li>
              ))}
              {alerts.length > 6 && (
                <li className={`text-xs opacity-60 ${
                  hasExpired ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'
                }`}>
                  + {alerts.length - 6} mais...
                </li>
              )}
            </ul>
          )}

          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => setExpanded((v) => !v)}
              className={`text-xs font-medium underline underline-offset-2 ${
                hasExpired ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'
              }`}
            >
              {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
            </button>

            {onGoToAgents && (
              <button
                onClick={onGoToAgents}
                className={`flex items-center gap-1 text-xs font-semibold ${
                  hasExpired ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'
                }`}
              >
                Ir para Agentes de Saúde
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <button
          onClick={dismiss}
          className={`p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0 ${
            hasExpired ? 'text-red-500 dark:text-red-400' : 'text-yellow-500 dark:text-yellow-400'
          }`}
          aria-label="Fechar alerta"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
