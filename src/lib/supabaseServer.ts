import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cliente usado em Server Components e API routes. Lê/escreve a
// sessão do usuário a partir dos cookies da requisição, então o
// RLS do Supabase aplica corretamente as policies baseadas em
// auth.uid() — cada usuário só vê o que a policy permite.
export function createSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set(name, value, options)
          } catch {
            // Chamado de um Server Component — middleware já cuida do refresh
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          } catch {
            // idem
          }
        },
      },
    }
  )
}
