# 🏥 Checklist Boa Vista II

Sistema de checklist mensal para apoio à equipe da **UBS Boa Vista II**, com autenticação por e-mail,
banco de dados compartilhado, importação de listas de faltosos, histórico de evolução e lembretes
automáticos — tudo rodando de graça em **Vercel + Supabase**.

---

## 🧱 Arquitetura

| Camada | Serviço | Custo |
|---|---|---|
| Front-end + API routes | **Vercel** (Next.js 14, App Router) | Grátis (Hobby) |
| Banco de dados + Autenticação | **Supabase** (Postgres + Auth) | Grátis (Free tier) |
| Envio de e-mails | **Resend** | Grátis até 3.000/mês |
| Código-fonte | **GitHub** | Grátis |
| Lembretes semanais | **Vercel Cron** | Grátis (incluso no Hobby) |

Login é feito por **Magic Link** (e-mail, sem senha) via Supabase Auth — não há WhatsApp, não há
servidor separado, não há infraestrutura para manter rodando 24h.

---

## 🎯 Foco em Previne Brasil

O checklist agora prioriza explicitamente os **7 indicadores oficiais de Pagamento por Desempenho**
do Previne Brasil (Portaria GM/MS 3.222/2019, ajustada pela 102/2022):

1. Pré-natal — 6+ consultas (1ª até a 12ª semana)
2. Pré-natal — Sífilis e HIV
3. Pré-natal — Atendimento odontológico
4. Citopatológico (Preventivo)
5. Vacinação até 1 ano (Penta + VIP)
6. Hipertensão — PA aferida no semestre
7. Diabetes — Hemoglobina glicada no semestre

Cada um desses indicadores foi desdobrado em ações concretas, distribuídas pelas categorias
profissionais corretas — incluindo o **ACS para busca ativa**, que é onde a maioria das UBS perde
pontos (pacientes elegíveis que nunca retornam para consulta/exame). Esses itens aparecem na seção
"🎯 Indicadores Previne Brasil", sempre no topo do checklist de cada profissional.

### Placar Previne Brasil (painel da coordenação)

A coordenação tem acesso a um placar com os 7 indicadores, mostrando:
- % de ações do checklist marcadas como concluídas (proxy interno de processo)
- Meta % vigente, que a própria coordenação edita (já que muda por nota técnica a cada quadrimestre)
- Status visual verde/amarelo/vermelho

> ⚠️ **Importante:** este placar é uma **estimativa interna de processo**, calculada a partir das ações
> do checklist — não é o número oficial do indicador. O cálculo oficial depende do numerador e
> denominador reais apurados pelo SISAB a partir dos registros no PEC. Para o resultado oficial,
> consulte o painel do Ministério da Saúde em [sisaps.saude.gov.br/painelsaps](https://sisaps.saude.gov.br/painelsaps/situacao-geral).
> Use o placar interno como sinal de acompanhamento da equipe, não como substituto do dado oficial.

---

## 📋 Funcionalidades

1. **Login por Magic Link** — cada pessoa da equipe recebe um link por e-mail, sem senha
2. **Checklist por categoria profissional** (médico, enfermeira, técnico, ACS, coordenação), com dados
   compartilhados entre dispositivos via Supabase
3. **Importação de CSV de faltosos** exportado do PEC/e-SUS — a coordenação importa, todos visualizam
4. **Histórico mensal com gráfico de evolução** (Recharts) — a coordenação "fecha o mês" e o snapshot
   fica salvo permanentemente
5. **Lembretes semanais automáticos por e-mail** — toda segunda-feira, cada profissional recebe um
   resumo de pendências
6. **Alerta crítico manual** — a coordenação pode disparar um e-mail imediato para qualquer categoria
7. **Relatório de impressão/PDF** do mês completo, com todos os profissionais
8. **Modo escuro**
9. Responsivo para celular, tablet e computador

---

## 👥 Agentes de Saúde e medicações controladas

Nova seção dedicada ao controle de renovação de receitas de medicação controlada (psicotrópicos,
antipsicóticos, opioides, anticonvulsivantes e outros). Disponível na aba "Agentes de Saúde", tanto
para ACS/médico (no checklist individual) quanto para a coordenação (no painel geral).

**Estrutura: Agente → Pacientes → Medicações**

1. A coordenação cadastra os agentes de saúde (apenas o nome)
2. Cada agente — ou a coordenação/médico em seu lugar — cadastra os pacientes que acompanha, sem
   necessidade de vínculo formal de microárea
3. Para cada paciente, cadastra-se uma ou mais medicações controladas, com nome, dosagem, posologia,
   classe da medicação, e o controle de vencimento da receita

**Controle de vencimento — duas formas:**
- **Data exata de término**: quando você já sabe a data exata em que a receita atual vence
- **Duração padrão em dias**: a partir da última renovação registrada (ex: 30 dias) — útil quando não
  há uma data fixa, apenas o padrão de repetição da receita

O sistema calcula automaticamente quantos dias faltam e classifica em três níveis: **em dia** (verde),
**renovar em breve** — alerta que aparece **7 dias antes do vencimento** (amarelo), e **vencida**
(vermelho). Ao clicar em "Marcar como renovada hoje", a data de última renovação é atualizada e a
contagem reinicia a partir da duração padrão configurada.

> **Nota sobre permissões:** como o cadastro não usa vínculo formal de microárea, o controle de "cada
> ACS só vê os seus pacientes" é organizacional (cada ACS naturalmente lida com sua própria lista),
> não tecnicamente bloqueado pelo banco — ACS, médico e coordenação têm acesso de leitura/escrita a
> todos os pacientes cadastrados. Isso é intencional, já que o médico precisa enxergar e editar a
> lista para de fato renovar as receitas.

---

## 🚀 Passo a passo completo de configuração

### 1. Crie o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) → **New Project**
2. Anote a senha do banco (você não vai precisar dela diretamente, mas guarde)
3. Espere o projeto provisionar (~2 minutos)

### 2. Rode a migration SQL

1. No painel do Supabase, vá em **SQL Editor** → **New Query**
2. Abra o arquivo `supabase/migration.sql` deste projeto, copie todo o conteúdo e cole no editor
3. Clique em **RUN**
4. Isso cria todas as tabelas (incluindo `previne_indicator_targets`, que guarda a meta % vigente de
   cada um dos 7 indicadores), as policies de segurança (RLS) e um trigger que vincula automaticamente
   cada login a um perfil da equipe

> **Já tem o banco rodando de uma versão anterior?** Basta rodar de novo o `migration.sql` completo —
> todos os comandos usam `create table if not exists`, então é seguro executar novamente; apenas a
> tabela nova (`previne_indicator_targets`) será criada, o resto é ignorado.

### 3. Cadastre a equipe real

A migration já insere 5 registros de exemplo na tabela `pending_team_members` com e-mails fictícios
(`medico@example.com`, etc). Você precisa trocá-los pelos e-mails reais:

1. No Supabase, vá em **Table Editor** → `pending_team_members`
2. Edite cada linha, trocando o e-mail de exemplo pelo e-mail real de cada profissional
3. Pode adicionar mais linhas se houver mais de uma pessoa por categoria (ex: dois ACS)

> **Como funciona:** quando alguém faz login pela primeira vez com um e-mail que está nesta tabela,
> um trigger automático cria o perfil completo (nome, categoria, UBS) na tabela `profiles`. Se o
> e-mail não estiver cadastrado aqui, a pessoa consegue receber o Magic Link (o Supabase Auth aceita
> qualquer e-mail por padrão), mas não terá um perfil — e o app vai mostrar erro ao carregar. Para
> travar isso de forma mais estrita, veja a seção "Restringir domínios de e-mail" abaixo.

### 4. Configure a URL de redirecionamento

1. No Supabase, vá em **Authentication** → **URL Configuration**
2. Em **Site URL**, coloque a URL do seu site (ex: `https://checklist-boavista2.vercel.app`)
3. Em **Redirect URLs**, adicione: `https://checklist-boavista2.vercel.app/auth/callback`
   (troque pelo seu domínio real; pode adicionar `http://localhost:3000/auth/callback` também, para testar localmente)

### 5. Copie as chaves de API

Em **Project Settings** → **API**, copie:
- **Project URL** → vai em `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → vai em `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** key → vai em `SUPABASE_SERVICE_ROLE_KEY` (⚠️ nunca exponha esta no front-end)

### 6. Crie uma conta no Resend (envio de e-mails)

1. Acesse [resend.com](https://resend.com) → crie uma conta gratuita
2. Vá em **API Keys** → **Create API Key** → copie o valor (`re_...`)
3. Para começar sem configurar domínio próprio, use o remetente de testes já incluso:
   `onboarding@resend.dev` — funciona imediatamente, mas só envia para o e-mail com o qual você
   criou a conta no Resend (limitação do modo de testes)
4. Para enviar para qualquer e-mail da equipe (recomendado em produção), verifique um domínio em
   **Domains** → siga as instruções de DNS → depois troque `RESEND_FROM_EMAIL` por algo como
   `Checklist Boa Vista II <checklist@seudominio.com.br>`

### 7. Suba o código para o GitHub

```bash
cd checklist-boavista2
git init
git add .
git commit -m "Checklist Boa Vista II - versão inicial"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/checklist-boavista2.git
git push -u origin main
```

### 8. Faça o deploy na Vercel

1. Acesse [vercel.com/new](https://vercel.com/new) e importe o repositório do GitHub
2. Em **Environment Variables**, adicione todas as variáveis do `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `CRON_SECRET` (gere uma string aleatória, ex: `openssl rand -base64 32`)
   - `NEXT_PUBLIC_APP_URL` (coloque a URL que a Vercel vai atribuir, ex: `https://checklist-boavista2.vercel.app` — você pode ajustar depois do primeiro deploy)
3. Clique em **Deploy**
4. Depois do primeiro deploy, copie a URL real gerada pela Vercel e:
   - Atualize `NEXT_PUBLIC_APP_URL` nas env vars da Vercel com essa URL
   - Volte ao Supabase e adicione essa URL em **Redirect URLs** (passo 4)
   - Faça um **redeploy** (Vercel → Deployments → ⋯ → Redeploy)

### 9. Configure o Cron de lembretes (já incluso)

O arquivo `vercel.json` já registra o cron job automaticamente:

```json
"crons": [{ "path": "/api/cron/weekly-reminders", "schedule": "0 11 * * 1" }]
```

Isso roda toda **segunda-feira às 11h UTC (8h em Brasília)**. A Vercel injeta automaticamente o header
de autorização usando a variável `CRON_SECRET` que você configurou — nenhuma ação extra é necessária.
Para mudar o dia/horário, edite a expressão cron (formato padrão Unix cron) e faça redeploy.

> No plano **Hobby** (gratuito) da Vercel, cron jobs só podem rodar **no máximo 1x por dia**. O
> schedule `0 11 * * 1` já respeita isso (1x por semana). Se quiser lembretes diários, precisa do
> plano Pro.

---

## 🧪 Rodando localmente

```bash
npm install
cp .env.example .env.local
# edite .env.local com suas chaves reais do Supabase e Resend
npm run dev
```

Acesse **http://localhost:3000** — você será redirecionado para `/login`.

---

## 📁 Estrutura do projeto

```
checklist-boavista2/
├── supabase/
│   └── migration.sql          ← Execute isso no SQL Editor do Supabase
├── src/
│   ├── app/
│   │   ├── login/page.tsx     ← Tela de login (Magic Link)
│   │   ├── auth/callback/route.ts  ← Troca o código do e-mail por sessão
│   │   ├── api/
│   │   │   ├── checklist/route.ts         ← GET/POST itens do checklist
│   │   │   ├── faltosos/route.ts          ← GET/PATCH lista de faltosos
│   │   │   ├── faltosos/import/route.ts   ← POST importação de CSV
│   │   │   ├── snapshots/route.ts         ← GET/POST histórico mensal
│   │   │   ├── notifications/critical-alert/route.ts  ← Alerta manual
│   │   │   └── cron/weekly-reminders/route.ts         ← Cron semanal
│   │   ├── layout.tsx
│   │   └── page.tsx           ← App principal (protegido por login)
│   ├── components/
│   │   ├── ChecklistItemCard.tsx
│   │   ├── ChecklistView.tsx
│   │   ├── CategorySection.tsx
│   │   ├── CoordinationPanel.tsx   ← Painel da coordenação + fechar mês + alertas
│   │   ├── FaltososPanel.tsx       ← Upload de CSV + lista de faltosos
│   │   ├── EvolutionChart.tsx      ← Gráfico de evolução (Recharts)
│   │   ├── PrintReport.tsx         ← Modal de relatório/impressão
│   │   ├── ProgressBar.tsx
│   │   └── StatsCard.tsx
│   ├── data/
│   │   └── checklist.ts       ← ⭐ Itens do checklist por categoria profissional
│   ├── lib/
│   │   ├── supabaseClient.ts  ← Cliente Supabase para o browser
│   │   ├── supabaseServer.ts  ← Cliente Supabase para Server Components/API
│   │   ├── supabaseAdmin.ts   ← Cliente com service_role (só em rotas privilegiadas)
│   │   ├── useAuth.tsx        ← Contexto de autenticação
│   │   ├── useDarkMode.ts
│   │   ├── storage.ts         ← Funções que chamam as API routes
│   │   ├── csvParser.ts       ← Parser flexível do CSV de faltosos
│   │   └── email.ts           ← Templates e envio via Resend
│   ├── types/index.ts
│   └── middleware.ts          ← Mantém a sessão do Supabase atualizada
├── vercel.json                ← Config de deploy + cron job
├── .env.example
└── package.json
```

---

## 🔒 Como funciona a segurança (RLS)

Todo o controle de acesso é feito por **Row Level Security** no Postgres do Supabase — não há checagem
de permissão "manual" no código, o banco recusa a operação:

- Cada profissional só **lê e escreve** itens de checklist da própria categoria
- A **coordenação** lê e escreve em todas as categorias
- Importar/excluir a lista de faltosos é restrito à **coordenação**
- Fechar o mês (gerar snapshot) é restrito à **coordenação**
- O histórico de notificações enviadas só é visível para a **coordenação**

Isso significa que mesmo que alguém manipule a chamada à API diretamente, o banco de dados bloqueia
qualquer tentativa fora da permissão do perfil autenticado.

---

## ➕ Adicionando ou removendo membros da equipe

1. No Supabase, **Table Editor** → `pending_team_members` → adicione uma linha com o e-mail, nome e
   categoria da nova pessoa
2. Ela faz login normalmente pela tela `/login` — o perfil é criado automaticamente no primeiro acesso
3. Para desativar alguém, vá em `profiles` e marque `active = false` (preserva o histórico, mas
   bloqueia notificações e acesso a partir de então — você pode reforçar isso adicionando uma
   verificação de `active` nas policies se quiser bloquear leitura também)

---

## ➕ Adicionando novos itens ao checklist

Edite `src/data/checklist.ts` e adicione um objeto ao array `CHECKLIST_ITEMS`:

```typescript
{
  id: 'med-011',
  title: 'Título do item',
  description: 'Descrição detalhada do que fazer.',
  category: 'hipertensos',
  professional: ['medico'],
  indicador: 'Nome do indicador SISAB',
}
```

---

## 📤 Formato esperado do CSV de faltosos

O parser (`src/lib/csvParser.ts`) é flexível e tenta reconhecer várias grafias de cabeçalho comuns
(com ou sem acento). Colunas reconhecidas:

| Campo | Cabeçalhos aceitos |
|---|---|
| Nome (obrigatório) | Nome, Paciente, Nome do Paciente |
| Condição | Condição, Categoria, Grupo, Tipo (aceita: hipertensão, diabetes, gestante, puérpera, idoso, criança, preventivo, vacinação) |
| CNS | CNS, Cartão SUS |
| Telefone | Telefone, Celular, Contato |
| Última consulta | Última Consulta, Data Última Consulta |
| Dias em atraso | Dias em Atraso, Dias sem Consulta |
| Microárea | Microárea, Área |
| ACS responsável | ACS, Agente |
| Observação | Observação, Obs |

Se uma coluna não for encontrada, o campo fica em branco — só **Nome** é obrigatório. Cada novo upload
**substitui completamente** a lista do mês selecionado (evita duplicação).

---

## ⚕️ Aviso importante

Este sistema é uma ferramenta **organizacional e gerencial** para apoio interno à equipe da UBS. Não é
um sistema médico assistencial e não substitui os sistemas oficiais do Ministério da Saúde. Os
indicadores devem sempre ser revisados conforme as normas vigentes do **SISAB**, **Previne Brasil** e
**Cofinanciamento APS**.

---

## 🛠️ Tecnologias

- [Next.js 14](https://nextjs.org/) (App Router) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) com modo escuro
- [Supabase](https://supabase.com/) — Postgres + Auth (Magic Link) + RLS
- [Resend](https://resend.com/) — envio de e-mails transacionais
- [Recharts](https://recharts.org/) — gráfico de evolução mensal
- [PapaParse](https://www.papaparse.com/) — parsing de CSV
- [Lucide React](https://lucide.dev/) — ícones
- Vercel Cron — agendamento de lembretes semanais
