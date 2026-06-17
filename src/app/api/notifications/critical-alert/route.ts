import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin, DEFAULT_UBS_ID } from '@/lib/supabaseAdmin'
import { sendReminderEmail } from '@/lib/email'

// POST /api/notifications/critical-alert
// Usado pela coordenação para disparar um aviso imediato por e-mail
// a uma categoria profissional específica.
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('professional')
    .eq('id', user.id)
    .maybeSingle()

  if (callerProfile?.professional !== 'coordenacao') {
    return NextResponse.json({ error: 'Apenas a coordenação pode enviar alertas' }, { status: 403 })
  }

  try {
    const { professional, message } = await req.json()
    if (!professional || !message) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    // Usa o cliente admin pois precisa ler e-mails de outros perfis
    const admin = getSupabaseAdmin()
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, name, email')
      .eq('ubs_id', DEFAULT_UBS_ID)
      .eq('professional', professional)
      .eq('active', true)

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px;">
          <h2 style="color: #b91c1c; font-size: 16px; margin: 0 0 8px;">⚠️ Alerta da Coordenação</h2>
          <p style="font-size: 14px; color: #1f2937; line-height: 1.5;">${message}</p>
        </div>
        <p style="font-size: 11px; color: #9ca3af; margin-top: 16px;">
          Checklist Boa Vista II — mensagem enviada pela coordenação da UBS.
        </p>
      </div>
    `

    const sentTo: string[] = []
    const failedTo: string[] = []

    for (const profile of profiles || []) {
      const result = await sendReminderEmail(profile.email, '⚠️ Alerta da Coordenação — Checklist Boa Vista II', html)

      await admin.from('notification_log').insert({
        profile_id: profile.id,
        email: profile.email,
        subject: 'Alerta da Coordenação',
        type: 'critical_alert',
        status: result.success ? 'sent' : 'failed',
      })

      if (result.success) sentTo.push(profile.name)
      else failedTo.push(profile.name)
    }

    return NextResponse.json({ success: true, sentTo, failedTo })
  } catch (err) {
    console.error('[critical-alert]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
