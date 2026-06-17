'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ProfessionalCategory,
  MONTHS,
  PROFESSIONAL_LABELS,
  PROFESSIONAL_COLORS,
} from '@/types'
import { ChecklistView } from '@/components/ChecklistView'
import { CoordinationPanel } from '@/components/CoordinationPanel'
import { FaltososPanel } from '@/components/FaltososPanel'
import { HealthAgentsPanel } from '@/components/HealthAgentsPanel'
import { PrintReport } from '@/components/PrintReport'
import { ProgressBar } from '@/components/ProgressBar'
import { fetchChecklistEntries } from '@/lib/storage'
import { getItemsByProfessional } from '@/data/checklist'
import { useDarkMode } from '@/lib/useDarkMode'
import { useAuth } from '@/lib/useAuth'
import { ArrowLeft, ClipboardList, Activity, Moon, Sun, Printer, LogOut, Loader2 } from 'lucide-react'

const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth() + 1

const PROFESSIONAL_ICON: Record<ProfessionalCategory, string> = {
  medico: '🩺',
  enfermeira: '🏥',
  tecnico: '💉',
  acs: '🏠',
  coordenacao: '📊',
}

type Step = 'month' | 'checklist'
type SubTab = 'checklist' | 'faltosos' | 'agentes'

export default function HomePage() {
  const { dark, toggle, mounted } = useDarkMode()
  const { profile, loading: authLoading, logout } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState<Step>('month')
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH)
  const [selectedYear] = useState(CURRENT_YEAR)
  const [showPrint, setShowPrint] = useState(false)
  const [subTab, setSubTab] = useState<SubTab>('checklist')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!authLoading && !profile) router.push('/login')
  }, [authLoading, profile, router])

  useEffect(() => {
    if (!profile) return
    getProfProgress()
    async function getProfProgress() {
      const items = getItemsByProfessional(profile!.professional)
      if (items.length === 0) return
      const entries = await fetchChecklistEntries(selectedMonth, selectedYear, profile!.professional)
      const done = items.filter((i) => entries[i.id]?.status === 'concluido').length
      setProgress(Math.round((done / items.length) * 100))
    }
  }, [profile, selectedMonth, selectedYear])

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    )
  }

  const isCoordenacao = profile.professional === 'coordenacao'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {step !== 'month' && (
            <button
              onClick={() => setStep('month')}
              className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2 flex-1">
            <div className="bg-blue-600 rounded-lg p-1.5">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-none">Checklist Boa Vista II</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 leading-none mt-0.5">UBS Boa Vista II</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {step === 'checklist' && (
              <button
                onClick={() => setShowPrint(true)}
                className="flex items-center gap-1.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors font-medium"
                title="Imprimir relatório do mês"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Relatório</span>
              </button>
            )}

            {mounted && (
              <button
                onClick={toggle}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={dark ? 'Modo claro' : 'Modo escuro'}
              >
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}

            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${PROFESSIONAL_COLORS[profile.professional]}`}>
              {PROFESSIONAL_LABELS[profile.professional]}
            </span>

            <button
              onClick={logout}
              className="p-2 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {step === 'month' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 opacity-80" />
                <span className="text-xs font-semibold opacity-80 uppercase tracking-wide">
                  Atenção Primária à Saúde
                </span>
              </div>
              <h2 className="text-2xl font-bold leading-tight">Olá, {profile.name.split(' ')[0]}!</h2>
              <p className="text-sm opacity-80 mt-1">
                {PROFESSIONAL_ICON[profile.professional]} {PROFESSIONAL_LABELS[profile.professional]} ·
                Acompanhe as ações mensais que impactam os indicadores SISAB.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Selecione o mês de referência</h3>
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((m, i) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(i + 1)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all border ${
                      selectedMonth === i + 1
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {m.slice(0, 3)}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Mês selecionado: <strong className="text-gray-800 dark:text-white">{MONTHS[selectedMonth - 1]} {selectedYear}</strong>
                </span>
              </div>

              {!isCoordenacao && (
                <div className="mt-3">
                  <ProgressBar value={progress} />
                </div>
              )}

              <button
                onClick={() => setStep('checklist')}
                className="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm"
              >
                Abrir checklist do mês →
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              <strong className="text-gray-700 dark:text-gray-300">⚕️ Aviso importante:</strong> Este sistema é uma ferramenta
              organizacional e gerencial para apoio à equipe da UBS. Não substitui sistemas oficiais de saúde.
              Os indicadores devem ser revisados conforme as normas vigentes do Ministério da Saúde.
            </div>
          </div>
        )}

        {step === 'checklist' && (
          isCoordenacao ? (
            <CoordinationPanel month={selectedMonth} year={selectedYear} />
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 flex-wrap">
                <button
                  onClick={() => setSubTab('checklist')}
                  className={`text-sm font-medium px-3 py-2 border-b-2 transition-colors ${
                    subTab === 'checklist' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Meu Checklist
                </button>
                <button
                  onClick={() => setSubTab('faltosos')}
                  className={`text-sm font-medium px-3 py-2 border-b-2 transition-colors ${
                    subTab === 'faltosos' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Faltosos
                </button>
                <button
                  onClick={() => setSubTab('agentes')}
                  className={`text-sm font-medium px-3 py-2 border-b-2 transition-colors ${
                    subTab === 'agentes' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Agentes de Saúde
                </button>
              </div>

              {subTab === 'checklist' && (
                <ChecklistView month={selectedMonth} year={selectedYear} professional={profile.professional} />
              )}
              {subTab === 'faltosos' && (
                <FaltososPanel month={selectedMonth} year={selectedYear} canImport={false} />
              )}
              {subTab === 'agentes' && (
                <HealthAgentsPanel canManageAgents={false} />
              )}
            </div>
          )
        )}
      </main>

      <footer className="mt-10 border-t border-gray-200 dark:border-gray-800 py-5 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-600">
          Checklist Boa Vista II — Uso interno da equipe · Dados armazenados de forma segura no Supabase
        </p>
      </footer>

      {showPrint && (
        <PrintReport month={selectedMonth} year={selectedYear} onClose={() => setShowPrint(false)} />
      )}
    </div>
  )
}
