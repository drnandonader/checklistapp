import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { DEFAULT_UBS_ID } from '@/lib/supabaseAdmin'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: announcements, error } = await supabase
    .from('announcements')
    .select('id, ubs_id, author_id, title, body, urgency, created_at, profiles!announcements_author_id_fkey(name, professional)')
    .eq('ubs_id', DEFAULT_UBS_ID)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: reads } = await supabase
    .from('announcement_reads')
    .select('announcement_id, profile_id')

  const { count: totalTeamCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('ubs_id', DEFAULT_UBS_ID)
    .eq('active', true)

  const readMap = new Map<string, Set<string>>()
  for (const r of reads || []) {
    if (!readMap.has(r.announcement_id)) readMap.set(r.announcement_id, new Set())
    readMap.get(r.announcement_id)!.add(r.profile_id)
  }

  const result = (announcements || []).map((a: Record<string, unknown>) => {
    const profile = a.profiles as { name: string; professional: string } | null
    const readers = readMap.get(a.id as string) || new Set()
    return {
      id: a.id,
      ubs_id: a.ubs_id,
      author_id: a.author_id,
      title: a.title,
      body: a.body,
      urgency: a.urgency,
      created_at: a.created_at,
      author_name: profile?.name || 'Desconhecido',
      author_professional: profile?.professional || '',
      readCount: readers.size,
      totalTeamCount: totalTeamCount || 0,
      readByMe: readers.has(user.id),
    }
  })

  return NextResponse.json({ announcements: result })
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { title, body, urgency } = await req.json()
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 })
    }

    const validUrgencies = ['normal', 'importante', 'urgente']
    const safeUrgency = validUrgencies.includes(urgency) ? urgency : 'normal'

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        ubs_id: DEFAULT_UBS_ID,
        author_id: user.id,
        title: title.trim(),
        body: (body || '').trim(),
        urgency: safeUrgency,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, announcement: data })
  } catch (err) {
    console.error('[announcements POST]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
