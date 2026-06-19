# Dashboard de Indicadores Previne Brasil

## Resumo

Painel visual dos 7 indicadores oficiais do Previne Brasil com duas fontes de dados: proxy interno (% de conclusao do checklist) e dados oficiais do SISAB (registrados pela coordenacao a cada quadrimestre). Todos os profissionais veem o dashboard; somente a coordenacao edita os dados oficiais.

## Abordagem

Evolucao do PrevineScoreboard existente. Nova aba "Indicadores" acessivel a todos os profissionais (page.tsx e CoordinationPanel.tsx). Expand inline para detalhe de cada indicador. Sem nova rota — consistente com a arquitetura single-page do projeto.

---

## 1. Dados

### Nova tabela: `previne_sisab_entries`

| Coluna         | Tipo        | Descricao                                          |
|----------------|-------------|-----------------------------------------------------|
| id             | uuid PK     | gen_random_uuid()                                   |
| ubs_id         | uuid        | FK para UBS (DEFAULT_UBS_ID no app)                 |
| indicator_id   | text        | Um dos 7 IDs: pn_consultas, pn_sifilis_hiv, etc.   |
| quadrimestre   | text        | Ex: "Q1/2026", "Q2/2026", "Q3/2026"                |
| numerador      | int         | Quantidade que atingiu o criterio                   |
| denominador    | int         | Total de elegiveis                                  |
| registered_by  | uuid        | FK para profiles (quem registrou)                   |
| created_at     | timestamptz | default now()                                       |

- Unique constraint: (ubs_id, indicator_id, quadrimestre)
- RLS: select para todos autenticados; insert/update so coordenacao (is_coordenacao())

### Nova API: `/api/previne-sisab`

**GET**: retorna todos os registros SISAB da UBS. Parametro opcional `?quadrimestre=Q1/2026`.

**POST**: upsert de um registro. Body: `{ indicator_id, quadrimestre, numerador, denominador }`. `registered_by` = user.id. Validacao: numerador <= denominador, ambos >= 0.

### Dados existentes aproveitados

- `/api/previne-score` — proxy do checklist (ja existe)
- `previne_indicator_targets` — metas por indicador (ja existe)

---

## 2. Componentes

### `PrevineIndicatorsPanel.tsx`

Props: `{ month: number; year: number; canEditSisab: boolean }`

**Vista overview**: 7 cards, um por indicador.

Cada card mostra:
- Nome do indicador (ex: "1. Pre-natal — 6+ consultas")
- Icone de status semaforo (verde/amarelo/vermelho/cinza)
- Barra dupla: proxy do checklist (%) + dado oficial SISAB (%)
- Se nao houver dado SISAB: texto "Sem dados oficiais"
- Meta quadrimestral como referencia
- Seta de tendencia: comparacao com quadrimestre anterior

**Vista detalhe** (expand inline ao clicar):
- Grafico de linha (recharts) com evolucao por quadrimestre: linha proxy (media dos meses do quadrimestre, calculada a partir dos snapshots mensais existentes), linha SISAB, linha meta
- Lista de acoes vinculadas: itens do checklist com `previneIndicator` vinculado, com status atual
- Formulario SISAB (visivel se `canEditSisab === true`): seletor de quadrimestre, campos numerador e denominador, botao salvar
- Resumo textual: "X de Y elegiveis atingiram o criterio (Z%)"

### Integracao na navegacao

**page.tsx** (profissionais):
- Nova opcao no SubTab: `'indicadores'`
- Renderiza `<PrevineIndicatorsPanel month={selectedMonth} year={selectedYear} canEditSisab={false} />`

**CoordinationPanel.tsx**:
- Nova opcao no tab: `'indicadores'`
- Renderiza com `canEditSisab={true}`
- PrevineScoreboard permanece na aba "Visao Geral" como resumo simplificado

---

## 3. Logica de negocio

### Calculo do quadrimestre

Funcao utilitaria `getQuadrimestre(month, year)`:
- Q1: jan-abr (meses 1-4)
- Q2: mai-ago (meses 5-8)
- Q3: set-dez (meses 9-12)
- Retorna: `{ label: "Q1/2026", quarter: 1, year: 2026 }`

### Status semaforo (dado SISAB)

- Verde: % >= meta configurada
- Amarelo: % entre (meta - 10%) e meta
- Vermelho: % < (meta - 10%)
- Cinza: sem dado registrado

### Tendencia

Compara % do quadrimestre atual com o anterior:
- Seta para cima: melhora
- Seta para baixo: piora
- Traco: sem dado anterior

### Edge cases

- Meta nao configurada: mostra dado SISAB sem semaforo, texto "Meta nao definida"
- Denominador = 0: mostra "Sem elegiveis" em vez de divisao por zero
- Formulario SISAB: numerador <= denominador, ambos >= 0

---

## 4. Arquivos a criar/modificar

### Criar
- `src/app/api/previne-sisab/route.ts` — GET e POST
- `src/components/PrevineIndicatorsPanel.tsx` — componente principal

### Modificar
- `src/types/index.ts` — tipo PrevineOfficialEntry e utilitarios
- `src/app/page.tsx` — adicionar aba "Indicadores" ao SubTab
- `src/components/CoordinationPanel.tsx` — adicionar aba "Indicadores" ao tab

### Supabase
- Criar tabela `previne_sisab_entries` com RLS

---

## 5. Fora do escopo

- Importacao automatica de dados do SISAB (nao ha API publica)
- Notificacoes por e-mail sobre indicadores
- Comparacao entre UBS diferentes
