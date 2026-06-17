import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { DEFAULT_UBS_ID } from '@/lib/supabaseAdmin'
import { parseFaltosoCSV } from '@/lib/csvParser'

// POST /api/faltosos/import
// Body: { month, year, csvContent }
// O RLS na tabela "faltosos" só permite insert/delete para perfis
// com professional = 'coordenacao' — se outro perfil chamar esta
// rota, o Supabase retorna erro de policy e nada é alterado.
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { month, year, csvContent } = await req.json()
    if (!month || !year || !csvContent) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    const { rows, errors, skipped } = parseFaltosoCSV(csvContent)

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma linha válida encontrada no CSV', details: errors },
        { status: 400 }
      )
    }

    // Remove importação anterior do mesmo mês (cada upload substitui a lista)
    const { error: deleteError } = await supabase
      .from('faltosos')
      .delete()
      .eq('ubs_id', DEFAULT_UBS_ID)
      .eq('month', month)
      .eq('year', year)

    if (deleteError) {
      return NextResponse.json(
        { error: `Sem permissão para importar (apenas coordenação): ${deleteError.message}` },
        { status: 403 }
      )
    }

    const toInsert = rows.map((row) => ({
      ubs_id: DEFAULT_UBS_ID,
      month,
      year,
      nome: row.nome,
      cns: row.cns || null,
      telefone: row.telefone || null,
      condicao: row.condicao,
      ultima_consulta: row.ultima_consulta || null,
      dias_em_atraso: row.dias_em_atraso ?? null,
      microarea: row.microarea || null,
      acs_responsavel: row.acs_responsavel || null,
      observacao: row.observacao || '',
      resolvido: false,
    }))

    const { error: insertError } = await supabase.from('faltosos').insert(toInsert)

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      imported: toInsert.length,
      skipped,
      warnings: errors,
    })
  } catch (err) {
    console.error('[faltosos/import]', err)
    return NextResponse.json({ error: 'Erro ao processar o arquivo' }, { status: 500 })
  }
}
