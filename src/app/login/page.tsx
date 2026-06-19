'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, Mail, Loader2, CheckCircle2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const authError = new URLSearchParams(window.location.search).get('error')
    if (authError === 'auth_timeout') {
      setError('O link demorou demais para ser validado. Solicite um novo link e tente novamente.')
    } else if (authError) {
      setError('O link é inválido, expirou ou já foi utilizado. Solicite um novo link.')
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const response = await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    setLoading(false)
    if (!response.ok) {
      setError('Não foi possível enviar o link. Verifique o e-mail e tente novamente.')
      return
    }
    setSent(true)
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
          {!sent ? (
            <>
              <h2 className="text-sm font-bold text-gray-800 dark:text-white mb-1">Entrar no sistema</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
                Digite o e-mail cadastrado pela coordenação. Você receberá um link de acesso — sem senha.
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
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Enviando...' : 'Enviar link de acesso'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-2">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-950/40 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-sm font-bold text-gray-800 dark:text-white mb-1">Link enviado!</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Verifique a caixa de entrada de <strong>{email}</strong> e clique no link para entrar.
                Pode levar alguns instantes — confira também a caixa de spam.
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-xs text-blue-600 dark:text-blue-400 mt-4 hover:underline"
              >
                Usar outro e-mail
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-600 text-center mt-5">
          Seu e-mail precisa estar pré-cadastrado pela coordenação da UBS.
        </p>
      </div>
    </div>
  )
}
