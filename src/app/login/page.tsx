'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, Mail, Loader2 } from 'lucide-react'
import { EMAIL_KEY } from '@/lib/useAuth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const authError = new URLSearchParams(window.location.search).get('error')

    if (authError === 'auto_login_failed') {
      localStorage.removeItem(EMAIL_KEY)
      setError('E-mail não cadastrado. Verifique com a coordenação.')
      return
    }

    if (authError) {
      setError('Erro ao entrar. Tente novamente.')
      return
    }

    const stored = localStorage.getItem(EMAIL_KEY)
    if (stored) {
      setLoading(true)
      window.location.href = `/api/auth/silent-login?email=${encodeURIComponent(stored)}`
    }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    window.location.href = `/api/auth/silent-login?email=${encodeURIComponent(email.trim().toLowerCase())}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Entrando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="bg-blue-600 rounded-xl p-2">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white leading-none">
              Checklist Boa Vista II
            </h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-none mt-0.5">UBS Boa Vista II</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 dark:text-white mb-1">Entrar no sistema</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
            Digite o e-mail cadastrado pela coordenação.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors"
            >
              Entrar
            </button>
          </form>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-600 text-center mt-5">
          Seu e-mail precisa estar pré-cadastrado pela coordenação da UBS.
        </p>
      </div>
    </div>
  )
}
