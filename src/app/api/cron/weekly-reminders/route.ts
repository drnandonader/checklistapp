import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, DEFAULT_UBS_ID } from '@/lib/supabaseAdmin'
import { sendReminderEmail, buildReminderEmailHtml } from '@/lib/email'
import { getItemsByProfessional } from '@/data/checklist'
import { ProfessionalCategory } from '@/types'
import { timingSafeEqual } from 'crypto'

const ALL_PROFESSIONALS: ProfessionalCategory[] = ['medico', 'enfermeira', 'tecnico', 'acs']

function verifyCronSecret(header: string | null): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret || !header) return false
  const expected = `Bearer ${secret}`
  if (expected.length !== header.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(header))
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  // Usa o cliente admin (service role) porque este cron precisa ler
  // o checklist de TODOS os profissionais, não apenas de um usuário logado.
  const supabase = getSupabaseAdmin()
  const sentTo: string[] = []
  const failedTo: string[] = []

  for (const professional of ALL_PROFESSIONALS) {
    const items = getItemsByProfessional(professional)
    const totalItems = items.length

    const { data: entries } = await supabase
      .from('checklist_entries')
      .select('item_id, status')
      .eq('ubs_id', DEFAULT_UBS_ID)
      .eq('professional', professional)
      .eq('month', month)
      .eq('year', year)

    const entryMap = new Map((entries || []).map((e) => [e.item_id, e.status]))
    const done = items.filter((i) => entryMap.get(i.id) === 'concluido').length
    const percent = totalItems > 0 ? Math.round((done / totalItems) * 100) : 0
    const pendingItems = items.filter((i) => entryMap.get(i.id) !== 'concluido')

    if (pendingItems.length === 0) continue // tudo feito, sem necessidade de lembrete

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('ubs_id', DEFAULT_UBS_ID)
      .eq('professional', professional)
      .eq('active', true)

    const topPending = pendingItems.slice(0, 3).map((i) => i.title)
    const moreCount = pendingItems.length - topPending.length

    for (const profile of profiles || []) {
      const html = buildReminderEmailHtml({
        name: profile.name.split(' ')[0],
        percent,
        done,
        total: totalItems,
        pendingTitles: topPending,
        moreCount,
        appUrl,
      })

      const result = await sendReminderEmail(
        profile.email,
        `📋 Checklist em ${percent}% — ${pendingItems.length} pendência(s) este mês`,
        html
      )

      await supabase.from('notification_log').insert({
        profile_id: profile.id,
        email: profile.email,
        subject: `Lembrete semanal — ${percent}% concluído`,
        type: 'weekly_reminder',
        status: result.success ? 'sent' : 'failed',
      })

      if (result.success) sentTo.push(profile.name)
      else failedTo.push(profile.name)
    }
  }

  return NextResponse.json({ success: true, sentTo, failedTo })
}
