'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { ProfessionalCategory } from '@/types'

export const EMAIL_KEY = 'checklist_email'

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const logout = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    localStorage.removeItem(EMAIL_KEY)
    setProfile(null)
    router.push('/login')
  }, [router])

  const loadProfile = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, name, email, professional')
      .eq('id', user.id)
      .maybeSingle()

    if (data) {
      localStorage.setItem(EMAIL_KEY, (data as AuthProfile).email)
      setProfile(data as AuthProfile)
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/profile', { method: 'POST' })
    if (res.ok) {
      const provisioned = await res.json() as AuthProfile
      localStorage.setItem(EMAIL_KEY, provisioned.email)
      setProfile(provisioned)
    } else {
      setProfile(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadProfile()

    const supabase = createSupabaseBrowserClient()
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(EMAIL_KEY)
        setProfile(null)
        return
      }
      if (event === 'SIGNED_IN') {
        setTimeout(() => void loadProfile(), 0)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [loadProfile])

  return (
    <AuthContext.Provider value={{ profile, loading, logout, refresh: loadProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
