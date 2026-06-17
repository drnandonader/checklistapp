import { Resend } from 'resend'

// Resend é gratuito até 3.000 e-mails/mês e 100/dia no plano free.
// Crie uma conta em resend.com, verifique um domínio (ou use o
// domínio de testes onboarding@resend.dev para começar sem custo
// e sem configurar DNS) e gere uma API Key em Resend > API Keys.

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Checklist Boa Vista II <onboarding@resend.dev>'

interface SendEmailResult {
  success: boolean
  error?: string
}

export async function sendReminderEmail(
  to: string,
  subject: string,
  htmlBody: string
): Promise<SendEmailResult> {
  if (!resendApiKey) {
    console.error('[Resend] RESEND_API_KEY não configurada no .env')
    return { success: false, error: 'resend_not_configured' }
  }

  try {
    const resend = new Resend(resendApiKey)
    const { error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: htmlBody,
    })

    if (error) {
      console.error('[Resend] Falha ao enviar e-mail:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[Resend] Erro inesperado:', err)
    return { success: false, error: 'unexpected_error' }
  }
}

export function buildReminderEmailHtml(opts: {
  name: string
  percent: number
  done: number
  total: number
  pendingTitles: string[]
  moreCount: number
  appUrl: string
}): string {
  const { name, percent, done, total, pendingTitles, moreCount, appUrl } = opts

  const barColor = percent >= 80 ? '#16a34a' : percent >= 50 ? '#d97706' : '#dc2626'

  return `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
    <div style="background: linear-gradient(135deg, #2563eb, #1e3a8a); padding: 24px; border-radius: 12px 12px 0 0;">
      <h1 style="color: white; font-size: 18px; margin: 0;">📋 Checklist Boa Vista II</h1>
      <p style="color: rgba(255,255,255,0.85); font-size: 13px; margin: 4px 0 0;">Lembrete semanal de pendências</p>
    </div>
    <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
      <p style="font-size: 14px;">Olá, <strong>${name}</strong>!</p>
      <p style="font-size: 13px; color: #4b5563;">
        Seu checklist deste mês está em <strong style="color: ${barColor};">${percent}%</strong>
        de conclusão (${done}/${total} itens).
      </p>

      <div style="background: #f3f4f6; border-radius: 8px; height: 8px; margin: 12px 0;">
        <div style="background: ${barColor}; height: 8px; border-radius: 8px; width: ${percent}%;"></div>
      </div>

      ${pendingTitles.length > 0 ? `
        <p style="font-size: 13px; font-weight: 600; color: #374151; margin-top: 16px;">Pendências prioritárias:</p>
        <ul style="font-size: 13px; color: #4b5563; padding-left: 18px; margin: 6px 0;">
          ${pendingTitles.map((t) => `<li style="margin-bottom: 4px;">${t}</li>`).join('')}
        </ul>
        ${moreCount > 0 ? `<p style="font-size: 12px; color: #9ca3af;">...e mais ${moreCount} item(ns) pendente(s).</p>` : ''}
      ` : '<p style="font-size: 13px; color: #16a34a; font-weight: 600;">✓ Tudo concluído este mês!</p>'}

      <a href="${appUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-top: 16px;">
        Acessar o checklist
      </a>

      <p style="font-size: 11px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px;">
        Este é um e-mail automático do sistema Checklist Boa Vista II. Os indicadores devem ser revisados
        conforme as normas vigentes do Ministério da Saúde (SISAB / Previne Brasil / Cofinanciamento APS).
      </p>
    </div>
  </div>
  `
}
