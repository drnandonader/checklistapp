import { ChecklistItem } from '@/types'

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 INDICADORES PREVINE BRASIL — prioridade máxima
  // Cada item abaixo está vinculado a um dos 7 indicadores oficiais de
  // Pagamento por Desempenho (Portaria GM/MS 3.222/2019, ajustada pela
  // 102/2022). O campo previneIndicator conecta o item ao indicador no
  // placar da coordenação.
  // ═══════════════════════════════════════════════════════════════════════

  // Indicador 1 — Pré-natal: 6+ consultas, 1ª até 12ª semana
  {
    id: 'prv-001',
    title: 'Realizar consulta de pré-natal (médico ou compartilhado)',
    description: 'Gestante precisa de 6+ consultas no total, com a 1ª até a 12ª semana gestacional. Registrar IG correta no PEC.',
    category: 'previne_brasil',
    professional: ['medico'],
    indicador: 'Indicador 1 — Previne Brasil',
    previneIndicator: 'pn_consultas',
  },
  {
    id: 'prv-002',
    title: 'Realizar consulta de pré-natal de enfermagem',
    description: 'Consultas de enfermagem contam para o total de 6+. Captação precoce (até 12ª semana) é o ponto crítico do indicador.',
    category: 'previne_brasil',
    professional: ['enfermeira'],
    indicador: 'Indicador 1 — Previne Brasil',
    previneIndicator: 'pn_consultas',
  },
  {
    id: 'prv-003',
    title: 'Captar gestante precocemente (1º trimestre) no território',
    description: 'Identificar gravidez e encaminhar para 1ª consulta antes da 12ª semana — sem isso, a gestante não conta no indicador mesmo fazendo as 6 consultas depois.',
    category: 'previne_brasil',
    professional: ['acs'],
    indicador: 'Indicador 1 — Previne Brasil',
    previneIndicator: 'pn_consultas',
  },
  {
    id: 'prv-004',
    title: 'Buscar ativamente gestantes com consulta de pré-natal em atraso',
    description: 'Verificar lista de gestantes sem consulta no mês e visitar para reagendamento.',
    category: 'previne_brasil',
    professional: ['acs'],
    indicador: 'Indicador 1 — Previne Brasil',
    previneIndicator: 'pn_consultas',
  },

  // Indicador 2 — Pré-natal: Sífilis e HIV
  {
    id: 'prv-005',
    title: 'Solicitar exames de sífilis e HIV no pré-natal',
    description: 'Solicitação deve ocorrer na 1ª consulta; registrar corretamente o procedimento no PEC para contar no indicador.',
    category: 'previne_brasil',
    professional: ['medico', 'enfermeira'],
    indicador: 'Indicador 2 — Previne Brasil',
    previneIndicator: 'pn_sifilis_hiv',
  },
  {
    id: 'prv-006',
    title: 'Coletar material para sífilis e HIV de gestantes',
    description: 'Apoiar coleta de sangue conforme solicitação médica/enfermagem, e checar se o resultado retornou e foi registrado.',
    category: 'previne_brasil',
    professional: ['tecnico'],
    indicador: 'Indicador 2 — Previne Brasil',
    previneIndicator: 'pn_sifilis_hiv',
  },

  // Indicador 3 — Pré-natal: Atendimento odontológico
  {
    id: 'prv-007',
    title: 'Encaminhar gestante para atendimento odontológico',
    description: 'Toda gestante deve ser encaminhada/agendada na odontologia da UBS ou rede de referência.',
    category: 'previne_brasil',
    professional: ['medico', 'enfermeira'],
    indicador: 'Indicador 3 — Previne Brasil',
    previneIndicator: 'pn_odonto',
  },
  {
    id: 'prv-008',
    title: 'Confirmar e lembrar gestante sobre consulta odontológica agendada',
    description: 'Reforçar durante visita domiciliar a importância de não faltar à consulta odontológica.',
    category: 'previne_brasil',
    professional: ['acs'],
    indicador: 'Indicador 3 — Previne Brasil',
    previneIndicator: 'pn_odonto',
  },

  // Indicador 4 — Citopatológico (Preventivo)
  {
    id: 'prv-009',
    title: 'Realizar coleta de citopatológico em mulheres elegíveis',
    description: 'Mulheres de 25 a 64 anos, priorizando quem está com exame em atraso (>3 anos ou nunca coletou).',
    category: 'previne_brasil',
    professional: ['enfermeira'],
    indicador: 'Indicador 4 — Previne Brasil',
    previneIndicator: 'citopatologico',
  },
  {
    id: 'prv-010',
    title: 'Apoiar e organizar coleta de citopatológico',
    description: 'Preparar sala, material de coleta e identificação correta das amostras antes do envio ao laboratório.',
    category: 'previne_brasil',
    professional: ['tecnico'],
    indicador: 'Indicador 4 — Previne Brasil',
    previneIndicator: 'citopatologico',
  },
  {
    id: 'prv-011',
    title: 'Buscar ativamente mulheres com preventivo em atraso',
    description: 'Usar lista de faltosos importada do PEC para identificar e visitar mulheres do território sem exame recente.',
    category: 'previne_brasil',
    professional: ['acs'],
    indicador: 'Indicador 4 — Previne Brasil',
    previneIndicator: 'citopatologico',
  },

  // Indicador 5 — Vacinação até 1 ano (Penta + VIP)
  {
    id: 'prv-012',
    title: 'Aplicar e registrar vacinas Penta e VIP em crianças até 1 ano',
    description: 'Conferir caderneta e aplicar doses pendentes do calendário básico; registro correto no sistema de imunização é obrigatório para contar.',
    category: 'previne_brasil',
    professional: ['tecnico', 'enfermeira'],
    indicador: 'Indicador 5 — Previne Brasil',
    previneIndicator: 'vacinacao_1ano',
  },
  {
    id: 'prv-013',
    title: 'Buscar ativamente crianças com vacina atrasada',
    description: 'Verificar caderneta de vacinação durante visita domiciliar e levar a família à UBS o quanto antes.',
    category: 'previne_brasil',
    professional: ['acs'],
    indicador: 'Indicador 5 — Previne Brasil',
    previneIndicator: 'vacinacao_1ano',
  },

  // Indicador 6 — Hipertensão: PA aferida no semestre
  {
    id: 'prv-014',
    title: 'Aferir e registrar PA de hipertensos cadastrados no semestre',
    description: 'Toda pessoa com HAS cadastrada precisa de pelo menos 1 consulta com PA aferida e registrada por semestre.',
    category: 'previne_brasil',
    professional: ['tecnico'],
    indicador: 'Indicador 6 — Previne Brasil',
    previneIndicator: 'has_pa',
  },
  {
    id: 'prv-015',
    title: 'Realizar consulta de hipertensos com registro de PA e CID/CIAP',
    description: 'Consulta médica ou de enfermagem com PA aferida e codificação correta — sem isso, não conta no indicador mesmo com a aferição feita.',
    category: 'previne_brasil',
    professional: ['medico', 'enfermeira'],
    indicador: 'Indicador 6 — Previne Brasil',
    previneIndicator: 'has_pa',
  },
  {
    id: 'prv-016',
    title: 'Buscar ativamente hipertensos sem consulta no semestre',
    description: 'Usar lista de faltosos para priorizar hipertensos sem registro de PA nos últimos 6 meses.',
    category: 'previne_brasil',
    professional: ['acs'],
    indicador: 'Indicador 6 — Previne Brasil',
    previneIndicator: 'has_pa',
  },

  // Indicador 7 — Diabetes: Hemoglobina glicada no semestre
  {
    id: 'prv-017',
    title: 'Solicitar hemoglobina glicada de diabéticos no semestre',
    description: 'Toda pessoa com DM cadastrada precisa de pelo menos 1 solicitação de HbA1c por semestre, com consulta registrada.',
    category: 'previne_brasil',
    professional: ['medico'],
    indicador: 'Indicador 7 — Previne Brasil',
    previneIndicator: 'dm_hba1c',
  },
  {
    id: 'prv-018',
    title: 'Coletar material para hemoglobina glicada',
    description: 'Apoiar coleta de sangue conforme solicitação médica e conferir retorno do resultado.',
    category: 'previne_brasil',
    professional: ['tecnico'],
    indicador: 'Indicador 7 — Previne Brasil',
    previneIndicator: 'dm_hba1c',
  },
  {
    id: 'prv-019',
    title: 'Buscar ativamente diabéticos sem exame no semestre',
    description: 'Usar lista de faltosos para priorizar diabéticos sem HbA1c registrada nos últimos 6 meses.',
    category: 'previne_brasil',
    professional: ['acs'],
    indicador: 'Indicador 7 — Previne Brasil',
    previneIndicator: 'dm_hba1c',
  },
  {
    id: 'prv-020',
    title: 'Monitorar os 7 indicadores no painel SISAP/e-Gestor a cada quadrimestre',
    description: 'Conferir resultado oficial no painel do Ministério da Saúde e comparar com a meta vigente.',
    category: 'previne_brasil',
    professional: ['coordenacao'],
    indicador: 'Painel Previne Brasil — todos os indicadores',
  },
  {
    id: 'prv-021',
    title: 'Atualizar a meta % vigente de cada indicador no sistema',
    description: 'A meta muda por nota técnica a cada quadrimestre — manter atualizada para o placar interno refletir a realidade.',
    category: 'previne_brasil',
    professional: ['coordenacao'],
    indicador: 'Painel Previne Brasil — todos os indicadores',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 📋 GESTÃO DA UBS — itens organizacionais e de apoio (segunda prioridade)
  // ═══════════════════════════════════════════════════════════════════════

  // ─── MÉDICO ────────────────────────────────────────────────────────────────
  {
    id: 'med-001',
    title: 'Atender hipertensos com PA registrada no PEC',
    description: 'Registrar pressão arterial aferida na consulta e CID/CIAP correspondente.',
    category: 'hipertensos',
    professional: ['medico'],
    indicador: 'Hipertensão — Indicador SISAB',
  },
  {
    id: 'med-002',
    title: 'Atender diabéticos com HbA1c solicitada ou avaliada',
    description: 'Solicitar hemoglobina glicada ou registrar resultado recente para pacientes DM.',
    category: 'diabeticos',
    professional: ['medico'],
    indicador: 'Diabetes Mellitus — Indicador SISAB',
  },
  {
    id: 'med-003',
    title: 'Realizar consulta de pré-natal médico quando indicado',
    description: 'Consultas de pré-natal compartilhado médico-enfermeiro, conforme protocolo.',
    category: 'gestantes_puerperas',
    professional: ['medico'],
    indicador: 'Pré-natal — Indicador SISAB',
  },
  {
    id: 'med-004',
    title: 'Avaliar idosos frágeis, acamados ou com multimorbidade',
    description: 'Consulta médica com avaliação funcional e plano de cuidado registrado.',
    category: 'idosos',
    professional: ['medico'],
    indicador: 'Saúde do Idoso — Cofinanciamento APS',
  },
  {
    id: 'med-005',
    title: 'Registrar CID e CIAP corretos em todas as consultas no PEC',
    description: 'Codificação adequada garante que atendimentos sejam computados nos indicadores.',
    category: 'registro_esus',
    professional: ['medico'],
    indicador: 'SISAB — Qualidade de registro',
  },
  {
    id: 'med-006',
    title: 'Revisar e atualizar plano terapêutico de pacientes crônicos',
    description: 'Hipertensos, diabéticos, DPOC, ICC — atualizar medicação e metas no PEC.',
    category: 'hipertensos',
    professional: ['medico'],
    indicador: 'Crônicos — SISAB',
  },
  {
    id: 'med-007',
    title: 'Realizar consulta de puerpério (até 42 dias pós-parto)',
    description: 'Garantir consulta de puerpério registrada no PEC dentro do prazo.',
    category: 'gestantes_puerperas',
    professional: ['medico'],
    indicador: 'Puerpério — Indicador SISAB',
  },
  {
    id: 'med-008',
    title: 'Verificar crianças com atraso no desenvolvimento ou baixo peso',
    description: 'Triagem de curva de crescimento e marcos de desenvolvimento.',
    category: 'criancas',
    professional: ['medico'],
    indicador: 'Saúde da Criança — SISAB',
  },
  {
    id: 'med-009',
    title: 'Atender faltosos com doenças de risco identificados pela equipe',
    description: 'Priorizar pacientes com DM, HAS, gestantes e idosos sem consulta há mais de 6 meses.',
    category: 'faltosos',
    professional: ['medico'],
    indicador: 'Cobertura — SISAB',
  },
  {
    id: 'med-010',
    title: 'Participar de discussão de casos com a equipe no mês',
    description: 'Reunião de equipe com análise de casos complexos e pacientes prioritários.',
    category: 'registro_esus',
    professional: ['medico'],
    indicador: 'Gestão da Clínica — APS',
  },

  // ─── ENFERMEIRA ────────────────────────────────────────────────────────────
  {
    id: 'enf-001',
    title: 'Realizar consulta de pré-natal para gestantes cadastradas',
    description: 'Consultas de pré-natal com registro no PEC, incluindo exames e IG.',
    category: 'gestantes_puerperas',
    professional: ['enfermeira'],
    indicador: 'Pré-natal — Indicador SISAB',
  },
  {
    id: 'enf-002',
    title: 'Conferir vacinação de gestantes (dTpa, influenza, COVID)',
    description: 'Verificar cartão de vacinas e registrar pendências.',
    category: 'vacinacao',
    professional: ['enfermeira'],
    indicador: 'Vacinação — Indicador SISAB',
  },
  {
    id: 'enf-003',
    title: 'Conferir vacinação de crianças (calendário básico)',
    description: 'Verificar crianças com atraso vacinal e acionar ACS para busca ativa.',
    category: 'vacinacao',
    professional: ['enfermeira'],
    indicador: 'Cobertura Vacinal — SISAB',
  },
  {
    id: 'enf-004',
    title: 'Realizar coleta de preventivo (citopatológico)',
    description: 'Coleta para mulheres entre 25-64 anos com exame em atraso.',
    category: 'saude_mulher',
    professional: ['enfermeira'],
    indicador: 'Câncer Colo do Útero — Indicador SISAB',
  },
  {
    id: 'enf-005',
    title: 'Acompanhar puérperas até 42 dias pós-parto',
    description: 'Consulta de puerpério com registro de amamentação, saúde mental e anticoncepção.',
    category: 'gestantes_puerperas',
    professional: ['enfermeira'],
    indicador: 'Puerpério — SISAB',
  },
  {
    id: 'enf-006',
    title: 'Organizar lista de hipertensos e diabéticos com consulta pendente',
    description: 'Gerar lista no PEC e acionar ACS para busca ativa dos faltosos.',
    category: 'faltosos',
    professional: ['enfermeira'],
    indicador: 'Cobertura Crônicos — SISAB',
  },
  {
    id: 'enf-007',
    title: 'Validar e corrigir registros incompletos no e-SUS/PEC',
    description: 'Revisar fichas sem CID, sem procedimento ou com campos obrigatórios em branco.',
    category: 'registro_esus',
    professional: ['enfermeira'],
    indicador: 'Qualidade SISAB',
  },
  {
    id: 'enf-008',
    title: 'Atualizar cadastros de gestantes no PEC',
    description: 'Garantir que todas as gestantes do território estejam cadastradas e ativas.',
    category: 'gestantes_puerperas',
    professional: ['enfermeira'],
    indicador: 'Cadastro — e-SUS',
  },
  {
    id: 'enf-009',
    title: 'Realizar consulta de enfermagem para hipertensos e diabéticos',
    description: 'Consulta de enfermagem com registro de PA, glicemia, medicamentos e orientações.',
    category: 'hipertensos',
    professional: ['enfermeira'],
    indicador: 'Crônicos — SISAB',
  },
  {
    id: 'enf-010',
    title: 'Acompanhar crescimento e desenvolvimento infantil',
    description: 'Puericultura com curva de crescimento, marcos de desenvolvimento e vacinas.',
    category: 'criancas',
    professional: ['enfermeira'],
    indicador: 'Saúde da Criança — SISAB',
  },

  // ─── TÉCNICO DE ENFERMAGEM ─────────────────────────────────────────────────
  {
    id: 'tec-001',
    title: 'Aferir e registrar PA de todos os hipertensos atendidos',
    description: 'PA deve ser lançada no PEC no mesmo dia do atendimento.',
    category: 'hipertensos',
    professional: ['tecnico'],
    indicador: 'Hipertensão — SISAB',
  },
  {
    id: 'tec-002',
    title: 'Realizar glicemia capilar quando indicada pelo médico ou enfermeiro',
    description: 'Registrar resultado e intercorrências no PEC ou ficha de atendimento.',
    category: 'diabeticos',
    professional: ['tecnico'],
    indicador: 'Diabetes — SISAB',
  },
  {
    id: 'tec-003',
    title: 'Apoiar vacinação conforme calendário e demanda',
    description: 'Aplicar vacinas e registrar corretamente no sistema de imunização.',
    category: 'vacinacao',
    professional: ['tecnico'],
    indicador: 'Vacinação — SISAB',
  },
  {
    id: 'tec-004',
    title: 'Conferir dados do paciente antes do lançamento no sistema',
    description: 'Nome, CPF, CNS, data de nascimento — erros impedem que atendimentos sejam computados.',
    category: 'registro_esus',
    professional: ['tecnico'],
    indicador: 'Qualidade de dado — SISAB',
  },
  {
    id: 'tec-005',
    title: 'Apoiar coleta de material para citopatológico',
    description: 'Organizar material, identificar amostras e garantir acondicionamento correto.',
    category: 'saude_mulher',
    professional: ['tecnico'],
    indicador: 'Câncer Colo — SISAB',
  },
  {
    id: 'tec-006',
    title: 'Verificar peso e altura de crianças e gestantes na consulta',
    description: 'Registrar antropometria no PEC para cálculo de IMC e curva de crescimento.',
    category: 'criancas',
    professional: ['tecnico'],
    indicador: 'Saúde da Criança — SISAB',
  },
  {
    id: 'tec-007',
    title: 'Organizar acolhimento e fluxo dos atendimentos do dia',
    description: 'Garantir que todos os pacientes saiam com consulta registrada no sistema.',
    category: 'registro_esus',
    professional: ['tecnico'],
    indicador: 'Produtividade — APS',
  },
  {
    id: 'tec-008',
    title: 'Conferir validade de medicamentos e materiais da sala de vacina',
    description: 'Controle de temperatura da geladeira e validade das vacinas.',
    category: 'vacinacao',
    professional: ['tecnico'],
    indicador: 'Qualidade Imunização',
  },

  // ─── ACS ───────────────────────────────────────────────────────────────────
  {
    id: 'acs-001',
    title: 'Atualizar cadastros domiciliares e individuais no e-SUS',
    description: 'Fichas de cadastro atualizadas são base para cálculo de cobertura da equipe.',
    category: 'cadastros',
    professional: ['acs'],
    indicador: 'Cadastro — e-SUS / SISAB',
  },
  {
    id: 'acs-002',
    title: 'Identificar e comunicar novas gestantes no território',
    description: 'Captar gestantes precocemente para garantir início de pré-natal no 1º trimestre.',
    category: 'gestantes_puerperas',
    professional: ['acs'],
    indicador: 'Pré-natal precoce — SISAB',
  },
  {
    id: 'acs-003',
    title: 'Realizar busca ativa de hipertensos e diabéticos faltosos',
    description: 'Visitar domicílios de pacientes sem consulta nos últimos 6 meses.',
    category: 'faltosos',
    professional: ['acs'],
    indicador: 'Cobertura Crônicos — SISAB',
  },
  {
    id: 'acs-004',
    title: 'Conferir crianças com vacina atrasada e comunicar à enfermagem',
    description: 'Verificar carteirinha de vacinas durante visitas e acionar unidade para regularização.',
    category: 'vacinacao',
    professional: ['acs'],
    indicador: 'Cobertura Vacinal — SISAB',
  },
  {
    id: 'acs-005',
    title: 'Identificar idosos frágeis, acamados ou sem acompanhamento',
    description: 'Informar à equipe para agendamento de consulta domiciliar ou prioritária.',
    category: 'idosos',
    professional: ['acs'],
    indicador: 'Saúde do Idoso — APS',
  },
  {
    id: 'acs-006',
    title: 'Registrar todas as visitas domiciliares no e-SUS',
    description: 'Ficha de visita domiciliar deve ser preenchida e enviada mensalmente.',
    category: 'visitas_domiciliares',
    professional: ['acs'],
    indicador: 'Visita Domiciliar — SISAB',
  },
  {
    id: 'acs-007',
    title: 'Comunicar pendências clínicas prioritárias ao médico e enfermeiro',
    description: 'Pacientes com sinais de alarme ou sem acompanhamento por mais de 1 ano.',
    category: 'faltosos',
    professional: ['acs'],
    indicador: 'Gestão de Risco — APS',
  },
  {
    id: 'acs-008',
    title: 'Orientar famílias sobre agendamento e importância das consultas',
    description: 'Educação em saúde durante visitas domiciliares.',
    category: 'visitas_domiciliares',
    professional: ['acs'],
    indicador: 'Educação em Saúde — APS',
  },
  {
    id: 'acs-009',
    title: 'Verificar mulheres com preventivo em atraso no território',
    description: 'Identificar mulheres de 25-64 anos sem citopatológico recente e acionar enfermagem.',
    category: 'saude_mulher',
    professional: ['acs'],
    indicador: 'Câncer Colo Útero — SISAB',
  },
  {
    id: 'acs-010',
    title: 'Atualizar informações de puérperas e recém-nascidos',
    description: 'Cadastrar RN e registrar condições de saúde da mãe no pós-parto.',
    category: 'gestantes_puerperas',
    professional: ['acs'],
    indicador: 'Puerpério — e-SUS',
  },

  // ─── COORDENAÇÃO ───────────────────────────────────────────────────────────
  {
    id: 'coord-001',
    title: 'Verificar envio das fichas do e-SUS ao SISAB no prazo',
    description: 'Garantir que produção do mês seja transmitida antes do fechamento do período.',
    category: 'registro_esus',
    professional: ['coordenacao'],
    indicador: 'Transmissão SISAB',
  },
  {
    id: 'coord-002',
    title: 'Analisar cobertura de pré-natal e identificar gestantes sem consulta',
    description: 'Relatório de gestantes cadastradas x atendidas no mês.',
    category: 'gestantes_puerperas',
    professional: ['coordenacao'],
    indicador: 'Pré-natal — SISAB',
  },
  {
    id: 'coord-003',
    title: 'Monitorar indicadores de hipertensão e diabetes no painel SISAB',
    description: 'Acompanhar metas do Previne Brasil / novo cofinanciamento APS mensalmente.',
    category: 'hipertensos',
    professional: ['coordenacao'],
    indicador: 'Painel SISAB',
  },
  {
    id: 'coord-004',
    title: 'Realizar reunião de equipe mensal com análise de indicadores',
    description: 'Apresentar painel de produção, metas e pendências para todos os profissionais.',
    category: 'registro_esus',
    professional: ['coordenacao'],
    indicador: 'Gestão APS',
  },
  {
    id: 'coord-005',
    title: 'Verificar cobertura vacinal e acionar equipe para busca ativa',
    description: 'Analisar dados de vacinação e planejar ação de imunização se cobertura baixa.',
    category: 'vacinacao',
    professional: ['coordenacao'],
    indicador: 'Cobertura Vacinal — SISAB',
  },
  {
    id: 'coord-006',
    title: 'Conferir completude dos cadastros da equipe (meta: 100% da área)',
    description: 'Cadastros incompletos reduzem denominador e afetam todos os indicadores.',
    category: 'cadastros',
    professional: ['coordenacao'],
    indicador: 'Cadastro — e-SUS',
  },
  {
    id: 'coord-007',
    title: 'Exportar e arquivar relatório mensal de produção',
    description: 'Salvar relatório do SISAB/PEC com produção, indicadores e metas.',
    category: 'registro_esus',
    professional: ['coordenacao'],
    indicador: 'Gestão Documental',
  },
  {
    id: 'coord-008',
    title: 'Acompanhar meta de citopatológico (preventivo) da equipe',
    description: 'Verificar quantidade de coletas no mês e comparar com meta anual.',
    category: 'saude_mulher',
    professional: ['coordenacao'],
    indicador: 'Câncer Colo Útero — SISAB',
  },
]

export function getItemsByProfessional(professional: string): ChecklistItem[] {
  return CHECKLIST_ITEMS.filter((item) =>
    item.professional.includes(professional as never)
  )
}

export function groupItemsByCategory(items: ChecklistItem[]) {
  const groups: Record<string, ChecklistItem[]> = {}
  for (const item of items) {
    if (!groups[item.category]) groups[item.category] = []
    groups[item.category].push(item)
  }
  return groups
}

// ─── Placar Previne Brasil (estimativa interna de processo) ─────────────
import {
  PrevineIndicatorId,
  PrevineIndicatorScore,
  PrevineIndicatorTarget,
  ChecklistEntry,
  PREVINE_INDICATORS,
} from '@/types'

export function getItemsByPrevineIndicator(id: PrevineIndicatorId): ChecklistItem[] {
  return CHECKLIST_ITEMS.filter((item) => item.previneIndicator === id)
}

// Calcula, para cada um dos 7 indicadores, quantas ações do checklist
// (de TODOS os profissionais) foram marcadas como concluídas no mês,
// e classifica em verde/amarelo/vermelho comparando com a meta configurada
// pela coordenação (se houver). Isto é um proxy interno de processo —
// não é o cálculo oficial do indicador, que depende do numerador/
// denominador real apurado pelo SISAB a partir dos registros no PEC.
export function computePrevineScores(
  allEntries: Record<string, ChecklistEntry>,
  targets: PrevineIndicatorTarget[]
): PrevineIndicatorScore[] {
  return PREVINE_INDICATORS.map((meta) => {
    const items = getItemsByPrevineIndicator(meta.id)
    const total = items.length
    const done = items.filter((i) => allEntries[i.id]?.status === 'concluido').length
    const processPercent = total > 0 ? Math.round((done / total) * 100) : 0

    const target = targets.find((t) => t.id === meta.id)?.target_percent ?? null

    let status: 'verde' | 'amarelo' | 'vermelho'
    if (target != null) {
      // Compara processo interno com a meta oficial configurada
      if (processPercent >= target) status = 'verde'
      else if (processPercent >= target * 0.7) status = 'amarelo'
      else status = 'vermelho'
    } else {
      // Sem meta configurada, usa faixas genéricas de processo
      if (processPercent >= 80) status = 'verde'
      else if (processPercent >= 50) status = 'amarelo'
      else status = 'vermelho'
    }

    return {
      id: meta.id,
      actionsDone: done,
      actionsTotal: total,
      processPercent,
      target,
      status,
    }
  })
}
