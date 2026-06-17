import { createBrowserClient } from '@supabase/ssr'

// Cliente usado em componentes 'use client'. Usa a chave ANON,
// que é segura de expor ao navegador — o acesso aos dados é
// controlado por Row Level Security (RLS) no Supabase, vinculado
// ao usuário autenticado via Supabase Auth (Magic Link).
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
