# Keept

> **Mantenha sua palavra.**

Keept é uma plataforma de responsabilidade pessoal. Você define objetivos, cria compromissos mensuráveis e, quando falha, uma consequência financeira calculada é destinada a uma causa social que você escolheu.

**Objetivo → Compromisso → Consequência → Impacto Social**

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Deploy | Vercel |

---

## Funcionalidades do MVP

- **Autenticação** — cadastro, login, logout, recuperação de senha
- **Objetivos** — criação por categoria (estudos, saúde, finanças, carreira…)
- **Compromissos** — metas mensuráveis com frequência e unidade configuráveis
- **Registro de Progresso** — manual, por data, com observação opcional
- **Sistema de Consequência** — cálculo automático de penalidade por unidade não cumprida
- **Causas Sociais** — 8 instituições pré-cadastradas; usuário escolhe a favorita
- **Dashboard** — visão semanal por objetivo com progresso e impacto
- **Tela de Impacto** — total acumulado, semana, mês, histórico
- **Histórico** — todos os registros agrupados por mês

---

## Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no [Supabase](https://supabase.com) (gratuita)
- Conta na [Vercel](https://vercel.com) (para deploy)

---

## Instalação local

### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/keept.git
cd keept
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local` com suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

### 4. Configurar o banco de dados no Supabase

**Opção A — Supabase Cloud (recomendado para início rápido):**

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Vá em **SQL Editor** no painel esquerdo
3. Clique em **New query**
4. Cole o conteúdo completo de `supabase/migrations/001_initial_schema.sql`
5. Clique em **Run**

O script cria todas as tabelas, políticas de segurança RLS, triggers e já insere as 8 causas sociais.

**Opção B — Supabase CLI (ambiente local):**

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Iniciar instância local
supabase start

# Aplicar migrations
supabase db push
```

### 5. Rodar o projeto

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## Estrutura do projeto

```
keept/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── layout.tsx                  # Root layout
│   │   ├── globals.css                 # Estilos globais + tokens
│   │   ├── auth/
│   │   │   ├── layout.tsx              # Layout split-screen
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   └── (app)/                      # Rotas protegidas
│   │       ├── layout.tsx              # Layout com sidebar
│   │       ├── dashboard/page.tsx
│   │       ├── goals/
│   │       │   ├── page.tsx            # Lista de objetivos
│   │       │   ├── new/page.tsx        # Criar objetivo
│   │       │   └── [id]/
│   │       │       ├── page.tsx        # Detalhe do objetivo
│   │       │       ├── commitments/new/page.tsx
│   │       │       └── progress/new/page.tsx
│   │       ├── impact/page.tsx
│   │       └── history/page.tsx
│   ├── components/
│   │   ├── ui/                         # Componentes base (shadcn-style)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── select.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toaster.tsx
│   │   │   └── dropdown-menu.tsx
│   │   ├── goals/
│   │   │   ├── goal-actions.tsx        # Dropdown de ações do objetivo
│   │   │   └── charity-card.tsx        # Seleção de causa social
│   │   └── layout/
│   │       └── sidebar.tsx             # Navegação lateral
│   ├── hooks/
│   │   └── use-toast.ts
│   ├── lib/
│   │   ├── utils.ts                    # formatCurrency, cálculos, labels
│   │   └── supabase/
│   │       ├── client.ts               # Browser client
│   │       └── server.ts               # Server client (SSR)
│   ├── types/
│   │   └── index.ts                    # Todas as interfaces TypeScript
│   └── middleware.ts                   # Proteção de rotas
├── supabase/
│   ├── config.toml
│   └── migrations/
│       └── 001_initial_schema.sql      # Schema completo + seed
├── .env.local.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Banco de dados

### Tabelas

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Extensão do `auth.users`. Armazena nome e causa social favorita. |
| `goals` | Objetivos do usuário. Status: ativo, pausado, concluído, abandonado. |
| `commitments` | Compromissos vinculados a um objetivo. Define meta, frequência, unidade e penalidade. |
| `progress_entries` | Registros de progresso manual por data. |
| `penalties` | Histórico de penalidades calculadas por período. |
| `charities` | Causas sociais disponíveis (seed incluído no migration). |

### Cálculo de penalidade

```
diferença = max(0, meta_valor - quantidade_realizada)
penalidade = diferença × penalidade_por_unidade
```

Regras:
- Nunca é negativa
- Se o usuário ultrapassar a meta, penalidade = 0
- Calculada em tempo real a partir dos registros de progresso

### Segurança (RLS)

Todas as tabelas de dados do usuário têm Row Level Security ativado. Cada usuário só acessa seus próprios dados. As `charities` são públicas (read-only).

---

## Deploy na Vercel

### 1. Conectar repositório

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **New Project**
3. Importe o repositório do GitHub
4. Framework: **Next.js** (detectado automaticamente)

### 2. Configurar variáveis de ambiente

No painel da Vercel, em **Settings → Environment Variables**, adicione:

```
NEXT_PUBLIC_SUPABASE_URL     = https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = sua-anon-key
```

### 3. Deploy

Clique em **Deploy**. A Vercel faz build e publica automaticamente.

### 4. Configurar URL de redirect no Supabase

Após obter a URL da Vercel (ex: `https://keept.vercel.app`), vá em:

**Supabase → Authentication → URL Configuration**

Adicione em **Redirect URLs**:
```
https://keept.vercel.app/**
```

---

## Fluxo do usuário

```
1. Cadastro / Login
       ↓
2. Dashboard (vazio) → Criar objetivo
       ↓
3. Objetivo criado → Criar compromisso(s)
       ↓
4. Escolher causa social (tela de Impacto)
       ↓
5. Registrar progresso diariamente
       ↓
6. Sistema calcula consequências automaticamente
       ↓
7. Dashboard mostra resumo semanal com impacto
```

---

## Próximos passos (pós-MVP)

- [ ] Integração com Pix/Stripe para doações reais
- [ ] Notificações por email / push no fim do período
- [ ] Relatório PDF de impacto mensal
- [ ] Compartilhamento de objetivos (modo público)
- [ ] Modo mobile (PWA)
- [ ] Períodos customizáveis por compromisso
- [ ] Integração com Google Agenda para registrar progresso
- [ ] Gamificação opcional (streaks, badges de consistência)

---

## Design

O Keept é intencionalmente minimalista. Inspirado em Linear, Notion e Stripe:

- Fundo branco com muito espaço em branco
- Tipografia Geist (sans + mono)
- Paleta: preto/cinza como primário, verde para sucesso, âmbar para atenção, vermelho suave para consequência
- Sem gamificação infantil — o produto é sério

### Linguagem de interface

| ❌ Evitar | ✅ Usar |
|-----------|---------|
| Punição | Consequência |
| Multa | Impacto |
| Castigo | Responsabilidade |
| Falha | Compromisso não cumprido |

---

## Licença

MIT — livre para uso e modificação.

---

*"Promessas devem ser mantidas."*
