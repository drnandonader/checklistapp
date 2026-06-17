export type ProfessionalCategory =
  | 'medico'
  | 'enfermeira'
  | 'tecnico'
  | 'acs'
  | 'coordenacao'

export type ItemStatus = 'pendente' | 'em_andamento' | 'concluido'

export type ItemCategory =
  | 'previne_brasil'
  | 'gestantes_puerperas'
  | 'hipertensos'
  | 'diabeticos'
  | 'saude_mulher'
  | 'criancas'
  | 'idosos'
  | 'vacinacao'
  | 'cadastros'
  | 'visitas_domiciliares'
  | 'faltosos'
  | 'registro_esus'

// Os 7 indicadores oficiais de Pagamento por Desempenho do Previne Brasil.
// Estrutura estável desde a Portaria GM/MS 3.222/2019 (ajustada pela
// Portaria 102/2022); o que muda por quadrimestre é a META %, configurada
// pela coordenação (ver PrevineIndicatorTarget).
export type PrevineIndicatorId =
  | 'pn_consultas'      // Indicador 1: 6+ consultas pré-natal, 1ª até 12ª semana
  | 'pn_sifilis_hiv'    // Indicador 2: gestantes com exames sífilis e HIV
  | 'pn_odonto'         // Indicador 3: gestantes com atendimento odontológico
  | 'citopatologico'    // Indicador 4: cobertura de citopatológico
  | 'vacinacao_1ano'    // Indicador 5: crianças 1 ano vacinadas (penta + VIP)
  | 'has_pa'            // Indicador 6: hipertensos com PA aferida no semestre
  | 'dm_hba1c'          // Indicador 7: diabéticos com hemoglobina glicada no semestre

export interface ChecklistItem {
  id: string
  title: string
  description: string
  category: ItemCategory
  professional: ProfessionalCategory[]
  indicador?: string
  previneIndicator?: PrevineIndicatorId // vincula este item a um dos 7 indicadores oficiais
}

export interface ChecklistEntry {
  itemId: string
  done: boolean
  status: ItemStatus
  observation: string
  quantity: string
  updatedAt: string
}

export interface MonthlyChecklist {
  month: number
  year: number
  professional: ProfessionalCategory
  entries: Record<string, ChecklistEntry>
}

export interface StorageData {
  checklists: MonthlyChecklist[]
}

// ─── Usuário / Autenticação ──────────────────────────────────────────────
export interface UbsUser {
  id: string
  ubs_id: string
  name: string
  phone: string // formato normalizado: 5524999998888
  professional: ProfessionalCategory
  active: boolean
}

// ─── Pacientes faltosos (importados via CSV do PEC) ─────────────────────
export type FaltosoCondition =
  | 'hipertensao'
  | 'diabetes'
  | 'gestante'
  | 'puerpera'
  | 'idoso'
  | 'crianca'
  | 'preventivo'
  | 'vacinacao'
  | 'outro'

export interface FaltosoPaciente {
  id: string
  ubs_id: string
  month: number
  year: number
  nome: string
  cns?: string
  telefone?: string
  condicao: FaltosoCondition
  ultima_consulta?: string // data ISO
  dias_em_atraso?: number
  microarea?: string
  acs_responsavel?: string
  observacao?: string
  resolvido: boolean
  imported_at: string
}

// ─── Histórico mensal (para gráfico de evolução) ─────────────────────────
export interface MonthlySnapshot {
  month: number
  year: number
  professional: ProfessionalCategory
  total_items: number
  done: number
  in_progress: number
  percent: number
}

// ─── Metas dos indicadores Previne Brasil (configurável pela coordenação) ─
// A meta % de cada indicador muda por nota técnica/quadrimestre do
// Ministério da Saúde. Como isso varia ao longo do tempo, a coordenação
// edita o valor vigente direto na interface, em vez de ficar fixo no código.
export interface PrevineIndicatorTarget {
  id: PrevineIndicatorId
  ubs_id: string
  target_percent: number   // meta % vigente, definida pela coordenação
  quadrimestre: string     // ex: "Q1/2026", apenas anotação livre
  updated_at: string
}

// Card de "placar" — ESTIMATIVA INTERNA DE PROCESSO, não o número oficial
// do SISAB. Calculado a partir da % de conclusão dos itens do checklist
// vinculados a cada indicador, apenas como sinal de acompanhamento da
// equipe — não substitui o relatório oficial do Previne Brasil.
export interface PrevineIndicatorScore {
  id: PrevineIndicatorId
  actionsDone: number
  actionsTotal: number
  processPercent: number   // % de ações do checklist concluídas (proxy interno)
  target: number | null    // meta configurada pela coordenação, se houver
  status: 'verde' | 'amarelo' | 'vermelho'
}

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril',
  'Maio', 'Junho', 'Julho', 'Agosto',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const MONTHS_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

export const PROFESSIONAL_LABELS: Record<ProfessionalCategory, string> = {
  medico: 'Médico(a)',
  enfermeira: 'Enfermeiro(a)',
  tecnico: 'Técnico(a) de Enfermagem',
  acs: 'Agente Comunitário de Saúde',
  coordenacao: 'Coordenação / Gerência',
}

export const PROFESSIONAL_COLORS: Record<ProfessionalCategory, string> = {
  medico: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  enfermeira: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900',
  tecnico: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900',
  acs: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900',
  coordenacao: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
}

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  previne_brasil: '🎯 Indicadores Previne Brasil',
  gestantes_puerperas: '🤰 Gestantes e Puérperas',
  hipertensos: '❤️ Hipertensos',
  diabeticos: '🩸 Diabéticos',
  saude_mulher: '🩺 Saúde da Mulher',
  criancas: '👶 Crianças',
  idosos: '👴 Idosos',
  vacinacao: '💉 Vacinação',
  cadastros: '📋 Cadastros',
  visitas_domiciliares: '🏠 Visitas Domiciliares',
  faltosos: '📞 Faltosos',
  registro_esus: '💻 Registro e-SUS/PEC',
}

export const STATUS_LABELS: Record<ItemStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
}

export const STATUS_COLORS: Record<ItemStatus, string> = {
  pendente: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  em_andamento: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400',
  concluido: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400',
}

export const FALTOSO_CONDITION_LABELS: Record<FaltosoCondition, string> = {
  hipertensao: '❤️ Hipertensão',
  diabetes: '🩸 Diabetes',
  gestante: '🤰 Gestante',
  puerpera: '👶 Puérpera',
  idoso: '👴 Idoso',
  crianca: '🧒 Criança',
  preventivo: '🩺 Preventivo',
  vacinacao: '💉 Vacinação',
  outro: '📋 Outro',
}

// ─── Metadados oficiais dos 7 indicadores do Previne Brasil ──────────────
export interface PrevineIndicatorMeta {
  id: PrevineIndicatorId
  numero: number
  titulo: string
  resumo: string // numerador/denominador em linguagem direta
  acaoEstrategica: string
}

export const PREVINE_INDICATORS: PrevineIndicatorMeta[] = [
  {
    id: 'pn_consultas',
    numero: 1,
    titulo: 'Pré-natal — 6+ consultas',
    resumo: 'Gestantes com 6 ou mais consultas de pré-natal, sendo a 1ª até a 12ª semana de gestação.',
    acaoEstrategica: 'Pré-natal',
  },
  {
    id: 'pn_sifilis_hiv',
    numero: 2,
    titulo: 'Pré-natal — Sífilis e HIV',
    resumo: 'Gestantes com realização de exames para sífilis e HIV durante o pré-natal.',
    acaoEstrategica: 'Pré-natal',
  },
  {
    id: 'pn_odonto',
    numero: 3,
    titulo: 'Pré-natal — Atendimento odontológico',
    resumo: 'Gestantes com atendimento odontológico realizado na APS.',
    acaoEstrategica: 'Pré-natal',
  },
  {
    id: 'citopatologico',
    numero: 4,
    titulo: 'Citopatológico (Preventivo)',
    resumo: 'Mulheres de 25 a 64 anos com coleta de citopatológico na APS.',
    acaoEstrategica: 'Saúde da Mulher',
  },
  {
    id: 'vacinacao_1ano',
    numero: 5,
    titulo: 'Vacinação até 1 ano',
    resumo: 'Crianças de 1 ano vacinadas com Penta e VIP (Poliomielite Inativada) na APS.',
    acaoEstrategica: 'Saúde da Criança',
  },
  {
    id: 'has_pa',
    numero: 6,
    titulo: 'Hipertensão — PA aferida',
    resumo: 'Pessoas com hipertensão (cadastradas) com consulta e pressão arterial aferida no semestre.',
    acaoEstrategica: 'Condições Crônicas',
  },
  {
    id: 'dm_hba1c',
    numero: 7,
    titulo: 'Diabetes — Hemoglobina glicada',
    resumo: 'Pessoas com diabetes (cadastradas) com consulta e hemoglobina glicada solicitada no semestre.',
    acaoEstrategica: 'Condições Crônicas',
  },
]

export const PREVINE_INDICATOR_LABELS: Record<PrevineIndicatorId, string> = Object.fromEntries(
  PREVINE_INDICATORS.map((i) => [i.id, `${i.numero}. ${i.titulo}`])
) as Record<PrevineIndicatorId, string>

// ─── Agentes de Saúde (ACS) — cadastro simples gerenciado pela coordenação ─
export interface HealthAgent {
  id: string
  ubs_id: string
  name: string
  active: boolean
  created_at: string
}

// ─── Pacientes sob cuidado de um Agente de Saúde ─────────────────────────
export interface AgentPatient {
  id: string
  ubs_id: string
  agent_id: string
  name: string
  notes?: string
  active: boolean
  created_at: string
}

// ─── Medicações controladas do paciente — foco em controle de renovação ──
export type MedicationClass =
  | 'psicotropico'      // ex: benzodiazepínicos, antidepressivos controlados
  | 'antipsicotico'
  | 'opioide'
  | 'anticonvulsivante'
  | 'outro_controlado'

export interface ControlledMedication {
  id: string
  patient_id: string
  name: string
  dosage?: string        // ex: "20mg"
  posology?: string      // ex: "1x ao dia, à noite"
  med_class: MedicationClass
  prescription_end_date?: string  // data ISO de término da receita atual, se conhecida
  duration_days?: number          // duração padrão em dias, usada como fallback
  last_renewed_at?: string        // data ISO da última renovação (usada com duration_days)
  notes?: string
  active: boolean
  created_at: string
  updated_at: string
}

export type RenewalUrgency = 'ok' | 'atencao' | 'vencido' | 'indefinido'

export const MEDICATION_CLASS_LABELS: Record<MedicationClass, string> = {
  psicotropico: 'Psicotrópico',
  antipsicotico: 'Antipsicótico',
  opioide: 'Opioide',
  anticonvulsivante: 'Anticonvulsivante',
  outro_controlado: 'Outro controlado',
}

export const MEDICATION_CLASS_COLORS: Record<MedicationClass, string> = {
  psicotropico: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
  antipsicotico: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  opioide: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  anticonvulsivante: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
  outro_controlado: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

export const RENEWAL_URGENCY_LABELS: Record<RenewalUrgency, string> = {
  ok: 'Em dia',
  atencao: 'Renovar em breve',
  vencido: 'Vencida',
  indefinido: 'Sem data definida',
}

export const RENEWAL_URGENCY_COLORS: Record<RenewalUrgency, string> = {
  ok: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900 text-green-700 dark:text-green-400',
  atencao: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900 text-yellow-700 dark:text-yellow-400',
  vencido: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-700 dark:text-red-400',
  indefinido: 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400',
}

// Janela de alerta antes do vencimento (dias) — configurável aqui se precisar ajustar
export const RENEWAL_ALERT_WINDOW_DAYS = 7

// Calcula a data efetiva de vencimento da receita: usa prescription_end_date
// se disponível; senão, soma duration_days a partir de last_renewed_at;
// se nenhum dos dois estiver presente, é "indefinido".
export function computeRenewalUrgency(med: Pick<ControlledMedication, 'prescription_end_date' | 'duration_days' | 'last_renewed_at'>): {
  urgency: RenewalUrgency
  dueDate: string | null
  daysRemaining: number | null
} {
  let dueDate: Date | null = null

  if (med.prescription_end_date) {
    dueDate = new Date(med.prescription_end_date)
  } else if (med.duration_days && med.last_renewed_at) {
    const base = new Date(med.last_renewed_at)
    dueDate = new Date(base.getTime() + med.duration_days * 24 * 60 * 60 * 1000)
  }

  if (!dueDate) {
    return { urgency: 'indefinido', dueDate: null, daysRemaining: null }
  }

  const now = new Date()
  const diffMs = dueDate.getTime() - now.setHours(0, 0, 0, 0)
  const daysRemaining = Math.ceil(diffMs / (24 * 60 * 60 * 1000))

  let urgency: RenewalUrgency
  if (daysRemaining < 0) urgency = 'vencido'
  else if (daysRemaining <= RENEWAL_ALERT_WINDOW_DAYS) urgency = 'atencao'
  else urgency = 'ok'

  return { urgency, dueDate: dueDate.toISOString(), daysRemaining }
}
