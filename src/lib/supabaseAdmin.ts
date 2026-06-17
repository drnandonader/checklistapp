import { createClient } from '@supabase/supabase-js'

// Cliente com a SERVICE ROLE KEY — ignora RLS completamente.
// Use APENAS em rotas que precisam operar entre usuários (ex: o
// cron de lembretes, que lê o checklist de toda a equipe para
// montar e-mails). Nunca importe isto em um componente 'use client'.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase admin não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env'
    )
  }

  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

export const DEFAULT_UBS_ID = '00000000-0000-0000-0000-000000000001'
