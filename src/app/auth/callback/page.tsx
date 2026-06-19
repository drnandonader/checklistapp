'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    let cancelled = false
    let timeout: ReturnType<typeof setTimeout> | undefined

    async function finishSignIn() {
      const hashParams = new URLSearchParams(window.location.hash.slice(1))
      const queryParams = new URLSearchParams(window.location.search)
      const authError = hashParams.get('error_description') ?? queryParams.get('error_description')

      if (authError) {
        throw new Error(authError)
      }

      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const code = queryParams.get('code')

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error) throw error
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) throw error
      }

      const { data: { user: verifiedUser }, error } = await supabase.auth.getUser()
      if (error || !verifiedUser) throw error ?? new Error('Sessão não encontrada')

      if (!cancelled) router.replace('/')
    }

    finishSignIn().catch(() => {
      if (!cancelled) router.replace('/login?error=auth_failed')
    })

    timeout = setTimeout(() => {
      if (!cancelled) router.replace('/login?error=auth_timeout')
    }, 15000)

    return () => {
      cancelled = true
      if (timeout) clearTimeout(timeout)
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Autenticando...</p>
      </div>
    </div>
  )
}
