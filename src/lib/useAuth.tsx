'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { ProfessionalCategory } from '@/types'

const SESSION_KEY = 'checklist_session_start'
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000 // 8 horas

interface AuthProfile {
  id: string
  name: string
  email: string
  professional: ProfessionalCategory
}

interface AuthContextValue {
  profile: AuthProfile | null
  loading: boolean
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function isSessionExpired(): boolean {
  const start = localStorage.getItem(SESSION_KEY)
  if (!start) return false
  return Date.now() - Number(start) > SESSION_DURATION_MS
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const logout = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    localStorage.removeItem(SESSION_KEY)
    setProfile(null)
    router.push('/login')
  }, [router])

  const scheduleAutoLogout = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const start = localStorage.getItem(SESSION_KEY)
    if (!start) return
    const remaining = SESSION_DURATION_MS - (Date.now() - Number(start))
    if (remaining <= 0) {
      logout()
      return
    }
    timerRef.current = setTimeout(() => logout(), remaining)
  }, [logout])

  const refresh = useCallback(async () => {
    setLoading(true)

    if (isSessionExpired()) {
      await logout()
      setLoading(false)
      return
    }

    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      localStorage.removeItem(SESSION_KEY)
      setProfile(null)
      setLoading(false)
      return
    }

    if (!localStorage.getItem(SESSION_KEY)) {
      localStorage.setItem(SESSION_KEY, String(Date.now()))
    }
    scheduleAutoLogout()

    const { data } = await supabase
      .from('profiles')
      .select('id, name, email, professional')
      .eq('id', user.id)
      .maybeSingle()

    if (data) {
      setProfile(data as AuthProfile)
      setLoading(false)
      return
    }

    const provisionResponse = await fetch('/api/auth/profile', { method: 'POST' })
    if (provisionResponse.ok) {
      const provisionedProfile = await provisionResponse.json()
      setProfile(provisionedProfile as AuthProfile)
    } else {
      setProfile(null)
    }
    setLoading(false)
  }, [logout, scheduleAutoLogout])

  useEffect(() => {
    refresh()

    const supabase = createSupabaseBrowserClient()
    const { data: listener } = supabase.auth.onAuthStateChange((_event) => {
      if (_event === 'SIGNED_IN') {
        if (!localStorage.getItem(SESSION_KEY)) {
          localStorage.setItem(SESSION_KEY, String(Date.now()))
        }
      }
      setTimeout(() => void refresh(), 0)
    })

    return () => {
      listener.subscription.unsubscribe()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [refresh])

  return (
    <AuthContext.Provider value={{ profile, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
