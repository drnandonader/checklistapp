import Papa from 'papaparse'
import { FaltosoCondition } from '@/types'

export interface ParsedFaltosoRow {
  nome: string
  cns?: string
  telefone?: string
  condicao: FaltosoCondition
  ultima_consulta?: string
  dias_em_atraso?: number
  microarea?: string
  acs_responsavel?: string
  observacao?: string
}

export interface ParseResult {
  rows: ParsedFaltosoRow[]
  errors: string[]
  skipped: number
}

// Mapeamento flexível: aceita várias grafias comuns de cabeçalho do PEC/planilhas manuais
const COLUMN_ALIASES: Record<string, string[]> = {
  nome: ['nome', 'paciente', 'nome do paciente', 'nome completo'],
  cns: ['cns', 'cartao sus', 'cartão sus', 'cartao_sus'],
  telefone: ['telefone', 'celular', 'contato', 'tel'],
  condicao: ['condicao', 'condição', 'categoria', 'grupo', 'tipo'],
  ultima_consulta: ['ultima consulta', 'última consulta', 'data ultima consulta', 'ultimo atendimento', 'último atendimento'],
  dias_em_atraso: ['dias em atraso', 'dias atraso', 'atraso (dias)', 'dias sem consulta'],
  microarea: ['microarea', 'micro-area', 'micro área', 'area', 'área'],
  acs_responsavel: ['acs', 'acs responsavel', 'acs responsável', 'agente'],
  observacao: ['observacao', 'observação', 'obs', 'nota'],
}

const CONDITION_NORMALIZE: Record<string, FaltosoCondition> = {
  hipertensao: 'hipertensao',
  hipertensão: 'hipertensao',
  has: 'hipertensao',
  diabetes: 'diabetes',
  dm: 'diabetes',
  diabetico: 'diabetes',
  diabético: 'diabetes',
  gestante: 'gestante',
  gravida: 'gestante',
  grávida: 'gestante',
  puerpera: 'puerpera',
  puérpera: 'puerpera',
  idoso: 'idoso',
  crianca: 'crianca',
  criança: 'crianca',
  preventivo: 'preventivo',
  citopatologico: 'preventivo',
  citopatológico: 'preventivo',
  vacinacao: 'vacinacao',
  vacinação: 'vacinacao',
  vacina: 'vacinacao',
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos para comparação
}

function findColumnKey(headers: string[], aliases: string[]): string | null {
  const normalizedAliases = aliases.map(normalizeHeader)
  for (const header of headers) {
    if (normalizedAliases.includes(normalizeHeader(header))) return header
  }
  return null
}

function normalizeCondition(raw: string | undefined): FaltosoCondition {
  if (!raw) return 'outro'
  const key = normalizeHeader(raw)
  return CONDITION_NORMALIZE[key] || 'outro'
}

export function parseFaltosoCSV(csvContent: string): ParseResult {
  const errors: string[] = []
  let skipped = 0

  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    delimiter: '', // auto-detecta vírgula ou ponto-e-vírgula
  })

  if (parsed.errors.length > 0) {
    for (const e of parsed.errors.slice(0, 5)) {
      errors.push(`Linha ${e.row}: ${e.message}`)
    }
  }

  const headers = parsed.meta.fields || []
  const colMap: Record<string, string | null> = {}
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    colMap[field] = findColumnKey(headers, aliases)
  }

  if (!colMap.nome) {
    errors.push(
      'Não foi possível identificar a coluna de nome do paciente. ' +
      'Verifique se o CSV possui uma coluna chamada "Nome" ou "Paciente".'
    )
    return { rows: [], errors, skipped: 0 }
  }

  const rows: ParsedFaltosoRow[] = []

  for (const record of parsed.data) {
    const nome = colMap.nome ? record[colMap.nome]?.trim() : ''
    if (!nome) {
      skipped++
      continue
    }

    const diasRaw = colMap.dias_em_atraso ? record[colMap.dias_em_atraso] : undefined
    const dias = diasRaw ? parseInt(diasRaw.replace(/\D/g, ''), 10) : undefined

    rows.push({
      nome,
      cns: colMap.cns ? record[colMap.cns]?.trim() : undefined,
      telefone: colMap.telefone ? record[colMap.telefone]?.trim() : undefined,
      condicao: normalizeCondition(colMap.condicao ? record[colMap.condicao] : undefined),
      ultima_consulta: colMap.ultima_consulta ? record[colMap.ultima_consulta]?.trim() : undefined,
      dias_em_atraso: Number.isFinite(dias) ? dias : undefined,
      microarea: colMap.microarea ? record[colMap.microarea]?.trim() : undefined,
      acs_responsavel: colMap.acs_responsavel ? record[colMap.acs_responsavel]?.trim() : undefined,
      observacao: colMap.observacao ? record[colMap.observacao]?.trim() : undefined,
    })
  }

  return { rows, errors, skipped }
}
