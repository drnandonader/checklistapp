'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { ProfessionalCategory } from '@/types'

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

  const refresh = useCallback(async () => {
    setLoading(true)
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

    setProfile(data as AuthProfile | null)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()

    const supabase = createSupabaseBrowserClient()
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      refresh()
    })

    return () => listener.subscription.unsubscribe()
  }, [refresh])

  async function logout() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    setProfile(null)
    router.push('/login')
  }

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
