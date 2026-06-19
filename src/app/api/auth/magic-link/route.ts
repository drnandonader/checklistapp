import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { sendReminderEmail } from '@/lib/email'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail } = await request.json()
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('name, email, active')
      .ilike('email', email)
      .eq('active', true)
      .maybeSingle()

    // Resposta genérica evita revelar quais e-mails estão cadastrados.
    if (!profile) {
      return NextResponse.json({ success: true })
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, '')
    const { data, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
      options: {
        redirectTo: `${appUrl}/auth/callback`,
      },
    })

    const actionLink = data.properties?.action_link
    if (linkError || !actionLink) {
      console.error('[magic-link] Falha ao gerar link:', linkError)
      return NextResponse.json({ error: 'Não foi possível gerar o link' }, { status: 500 })
    }

    const safeName = escapeHtml(profile.name)
    const safeLink = escapeHtml(actionLink)
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
        <div style="background: linear-gradient(135deg, #2563eb, #1e3a8a); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; font-size: 18px; margin: 0;">📋 Checklist Boa Vista II</h1>
          <p style="color: rgba(255,255,255,0.85); font-size: 13px; margin: 4px 0 0;">Acesso seguro ao sistema</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
          <p style="font-size: 14px;">Olá, <strong>${safeName}</strong>!</p>
          <p style="font-size: 13px; color: #4b5563;">Clique no botão abaixo para entrar. O link é individual, expira e só pode ser utilizado uma vez.</p>
          <a href="${safeLink}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 11px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-top: 12px;">
            Entrar no Checklist
          </a>
          <p style="font-size: 11px; color: #9ca3af; margin-top: 24px;">Se você não solicitou este acesso, ignore este e-mail.</p>
        </div>
      </div>
    `

    const sendResult = await sendReminderEmail(
      profile.email,
      'Seu link de acesso — Checklist Boa Vista II',
      html
    )

    if (!sendResult.success) {
      console.error('[magic-link] Falha ao enviar:', sendResult.error)
      return NextResponse.json({ error: 'Não foi possível enviar o link' }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[magic-link] Erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
