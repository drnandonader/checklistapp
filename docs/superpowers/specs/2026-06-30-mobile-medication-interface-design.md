# Mobile Medication Interface — Design Spec
**Data:** 2026-06-30  
**Projeto:** Checklist Boa Vista II  
**Escopo:** Nova aba "Receitas" para médico + interface mobile redesenhada para ACS

---

## 1. Contexto

O app já possui:
- `HealthAgentsPanel` — gerenciamento de agentes/pacientes/medicações (usado pela coordenação)
- `MedicationAlertBanner` — banner de urgência na tela inicial
- `computeRenewalUrgency` com threshold de 7 dias
- API `GET /api/controlled-medications/expiring-soon`
- Tabelas: `health_agents`, `agent_patients`, `controlled_medications`

O que falta: uma interface mobile-first para médico e ACS operarem medicações diretamente no celular, sem depender do painel da coordenação.

---

## 2. Estrutura de Navegação

### Abas visíveis por perfil (tela `step === 'checklist'`)

| Aba | medico | enfermeira | tecnico | acs | coordenacao |
|---|---|---|---|---|---|
| Visitas da Semana | ✓ | ✓ | ✓ | ✓ | — |
| Meu Checklist | ✓ | ✓ | ✓ | ✓ | — |
| Faltosos | ✓ | ✓ | ✓ | ✓ | — |
| Agentes de Saúde | — | — | — | ✓ | ✓ |
| **Receitas** *(novo)* | ✓ | — | — | — | ✓ |
| Mural de Recados | ✓ | ✓ | ✓ | ✓ | — |

**Nota:** ACS acessa medicações pela aba "Agentes de Saúde" (já existente, mas redesenhada com `MobileAgentsView`). Coordenação mantém `HealthAgentsPanel` (canManageAgents=true) e ganha aba "Receitas" para visão médica.

---

## 3. Aba "Receitas" (médico + coordenação)

### Componente: `MedRenovationView`

**Arquivo:** `src/components/MedRenovationView.tsx`

#### 3a. Painel de Urgências (view inicial)

Mostra medicações com urgency `vencido` ou `atencao`, agrupadas:

```
┌─────────────────────────────────────┐
│ 🔴 VENCIDAS (2)                    │
├─────────────────────────────────────┤
│ João Silva                          │
│ Clonazepam 2mg · Psicotrópico      │
│ Venceu há 3 dias — ACS: Maria      │
│ [✓ Renovar hoje] [📅 Editar data]  │
├─────────────────────────────────────┤
│ 🟡 VENCEM EM BREVE (5)             │
├─────────────────────────────────────┤
│ Ana Souza                           │
│ Haloperidol 5mg · Antipsicótico    │
│ Vence em 4 dias · 04/07/2026       │
│ [✓ Renovar hoje] [📅 Editar data]  │
└─────────────────────────────────────┘
```

**Ações inline por medicação:**
- **"Renovar hoje"** — PATCH `last_renewed_at = today`, `prescription_end_date = null`. Otimista: item some da lista imediatamente.
- **"Editar data"** — expande inline um `<input type="date">` para definir novo `prescription_end_date`. Confirma com botão "Salvar".

**Estados:**
- Loading skeleton durante fetch
- Empty state: "Nenhuma receita urgente no momento 🎉"
- Erro: mensagem com botão "Tentar novamente"

**Fonte de dados:** `GET /api/controlled-medications/expiring-soon` (já existe)

#### 3b. Botão "Ver todos os pacientes"

Botão fixo no topo da aba, ao lado do título. Alterna entre painel de urgências e `MobileAgentsView` (com permissão total, mesmo componente do ACS).

---

## 4. Interface Mobile do ACS (`MobileAgentsView`)

**Arquivo:** `src/components/MobileAgentsView.tsx`

Substitui `HealthAgentsPanel` para perfis `acs` e `medico` (quando acessam via "Ver todos os pacientes"). A coordenação continua usando `HealthAgentsPanel`.

### Princípios UX
- Touch targets ≥ 48px
- Formulários ocupam tela inteira (sem modais comprimidos)
- Teclado correto por campo: `inputMode="text"` para nome, `inputMode="numeric"` para duração, `type="date"` para datas
- Feedback visual imediato: botão de salvar mostra spinner, item aparece na lista sem reload completo
- Navegação por níveis com botão "Voltar" claro

### Nível 1 — Lista de Agentes

Cards grandes com:
- Avatar colorido inicial do nome
- Nome do agente
- Badge vermelho com contagem de urgências (se houver)

### Nível 2 — Pacientes do Agente

- Header com nome do agente
- Cards de pacientes: nome, contagem de medicações, badge de urgência
- **Botão "+ Novo Paciente" fixo no rodapé** (posição `fixed bottom-4`)
- Formulário de novo paciente: nome (obrigatório) + observações (opcional), inline abaixo do header

### Nível 3 — Medicações e Observações do Paciente

Duas abas: **Medicações** | **Observações**

**Aba Medicações:**
- Lista de medicações com cores de urgência (mesmo visual do `HealthAgentsPanel` atual)
- Botão "+ Nova Medicação" fixo no rodapé
- Formulário de medicação em tela cheia com autocomplete (ver seção 5)
- Ações: editar (expande formulário inline), remover, renovar hoje

**Aba Observações:**
- Idêntica à `ObservationsSection` atual, mas com input maior e botão mais visível

---

## 5. Autocomplete de Medicamentos

### API: `GET /api/controlled-medications/suggestions?q=<termo>`

**Arquivo:** `src/app/api/controlled-medications/suggestions/route.ts`

**Lógica:**
1. Se `q` tiver menos de 2 caracteres: retorna lista vazia
2. Busca nomes distintos no Supabase (`controlled_medications` JOIN `agent_patients` JOIN `health_agents`) filtrados por `ubs_id` do usuário logado, ILIKE `%q%`, ordenados por frequência DESC, limite 5
3. Filtra a lista fixa de ~60 medicamentos controlados comuns, ILIKE `%q%`, limite 5
4. Remove da lista fixa os que já aparecem nos resultados do Supabase (dedup por nome normalizado)
5. Retorna `{ fromDb: string[], fromList: string[] }`

**Lista fixa (constante no código):**
Inclui os controlados mais comuns do Brasil: Clonazepam, Diazepam, Alprazolam, Lorazepam, Midazolam, Bromazepam, Clobazam, Nitrazepam, Haloperidol, Risperidona, Olanzapina, Quetiapina, Ziprasidona, Clozapina, Aripiprazol, Clorpromazina, Tioridazina, Flufenazina, Amitriptilina, Nortriptilina, Imipramina, Clomipramina, Fluoxetina, Sertralina, Paroxetina, Venlafaxina, Duloxetina, Bupropiona, Mirtazapina, Trazodona, Fenobarbital, Carbamazepina, Fenitoína, Valproato de Sódio, Ácido Valpróico, Lamotrigina, Topiramato, Gabapentina, Pregabalina, Levetiracetam, Oxcarbazepina, Morfina, Codeína, Tramadol, Metilfenidato, Anfetamina, Lisdexanfetamina, Modafinila, Zolpidem, Zopiclona, Flunitrazepam, Biperideno, Triexifenidila, Carbonato de Lítio, Lítio, Metadona.

### Componente: `MedicationAutocomplete`

**Arquivo:** `src/components/MedicationAutocomplete.tsx`

Input controlado com dropdown abaixo:

```
[Clonaze_________________]
┌─────────────────────────┐
│ Já usados               │
│ • Clonazepam 2mg        │  ← fromDb (nome completo com dosagem)
│ • Clonazepam 0,5mg      │
│ ──── Sugestões ────     │
│ • Clonazepam            │  ← fromList
└─────────────────────────┘
```

**Comportamento:**
- Debounce de 250ms após digitação
- Mínimo 2 caracteres para disparar
- Toque numa sugestão preenche o campo `name` e fecha o dropdown
- Se `fromDb` traz nome com dosagem (ex: "Clonazepam 2mg"), preenche também o campo `dosage`
- Tecla Escape fecha o dropdown
- Clique fora fecha o dropdown

---

## 6. Arquivos Afetados

### Novos
| Arquivo | Descrição |
|---|---|
| `src/components/MedRenovationView.tsx` | Aba Receitas do médico |
| `src/components/MobileAgentsView.tsx` | Interface mobile ACS/médico |
| `src/components/MedicationAutocomplete.tsx` | Input com autocomplete |
| `src/app/api/controlled-medications/suggestions/route.ts` | API de sugestões |

### Modificados
| Arquivo | Mudança |
|---|---|
| `src/app/page.tsx` | Adicionar aba "Receitas" para médico/coordenação; passar `MobileAgentsView` para ACS |
| `src/components/MedRenovationView.tsx` | *(novo)* |

### Sem mudança
| Arquivo | Motivo |
|---|---|
| `src/components/HealthAgentsPanel.tsx` | Coordenação continua usando-o |
| `src/types/index.ts` | Tipos suficientes |
| `supabase/migration.sql` | Schema não muda |
| `src/app/api/controlled-medications/route.ts` | CRUD existente é suficiente |

---

## 7. Fluxo de Dados

```
Médico abre aba "Receitas"
  → MedRenovationView monta
  → GET /api/controlled-medications/expiring-soon
  → Exibe agrupado por urgência
  → [Renovar hoje] → PATCH /api/controlled-medications
  → [Editar data]  → PATCH /api/controlled-medications
  → [Ver todos]    → MobileAgentsView (modo médico)

ACS abre aba "Agentes de Saúde"
  → MobileAgentsView monta
  → GET /api/health-agents
  → Seleciona agente → GET /api/agent-patients?agent_id=X
  → Seleciona paciente → GET /api/controlled-medications?patient_id=Y
  → [+ Nova Medicação] → MedicationAutocomplete ativo
    → GET /api/controlled-medications/suggestions?q=XX (debounce 250ms)
    → Seleciona sugestão → preenche campos
  → [Salvar] → POST /api/controlled-medications
```

---

## 8. Tratamento de Erros

- Fetch com erro de rede: toast/mensagem inline com "Tentar novamente"
- PATCH de renovação com falha: reverter estado otimista, mostrar erro
- Autocomplete com falha: silencioso (não bloqueia digitação manual)
- Campo obrigatório vazio: botão salvar desabilitado + borda vermelha no campo

---

## 9. Fora de Escopo

- Push notifications nativas (browser/SO)
- Instalação como PWA
- Sincronização offline
- Filtros avançados na lista de urgências (por agente, por classe)
- Histórico de renovações
