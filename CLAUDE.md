# CLAUDE.md — Turma do Rola Comary · Sistema de Ranking

## Visão do Projeto

Sistema web para controle de presença, estatísticas e ranking do grupo de futebol "Turma do Rola - Comary". Separa jogadores de linha e goleiros em rankings independentes. Ver `PRD.md` para requisitos completos.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Linguagem | TypeScript |
| Estilização | Tailwind CSS |
| Banco de dados | Supabase (PostgreSQL gerenciado) |
| Client DB | `@supabase/supabase-js` |
| Deploy | Vercel |
| PDF | `jspdf` + `jspdf-autotable` |

---

## Estrutura de Pastas

```
/
├── app/
│   ├── layout.tsx              # Layout raiz com Navbar
│   ├── page.tsx                # Dashboard (ranking público)
│   ├── cadastro/page.tsx       # Cadastro + lista de atletas (protegido)
│   ├── rodada/page.tsx         # Painel da rodada (protegido)
│   └── historico/page.tsx      # Histórico de rodadas (protegido)
├── actions/
│   ├── jogadores.ts            # Server Actions de jogadores
│   ├── goleiros.ts             # Server Actions de goleiros
│   └── rodadas.ts              # Server Actions de rodadas
├── lib/
│   └── supabase.ts             # Clientes Supabase (server + browser)
├── components/
│   ├── Navbar.tsx
│   ├── ProtectedRoute.tsx      # Guard de senha via sessionStorage
│   ├── TabelaRanking.tsx
│   └── ModalEditar.tsx
├── types/
│   └── index.ts                # Tipos: Atleta, PresencaRodada, etc.
└── utils/
    └── exportPdf.ts
```

---

## Regras de Negócio Críticas

### Pontuação por Rodada
```ts
// Em actions/rodadas.ts — NUNCA no componente cliente
function calcularPontos(presente: boolean, cartaoVermelho: boolean): number {
  if (!presente) return 0
  return cartaoVermelho ? 2 : 3
}
```

### Ranking
```
pontuacaoAtual = pontuacaoInicial + Σ pontosGanhos
```
Retornado em ordem decrescente. Duas consultas separadas: uma para Linha, outra para Goleiros.

### Atletas
- Tabelas separadas: `jogadores` e `goleiros`
- Duplicata proibida: índice único em `(nome, telefone)` em cada tabela
- Ao editar `pontuacao_inicial`: ajustar `pontuacao_atual` pelo delta
- Ao excluir atleta: cascade em `presencas_rodada`
- Ao excluir rodada: estornar `pontos_ganhos` de cada atleta

---

## Modelo de Dados (Supabase)

### Tabelas `jogadores` e `goleiros` (estrutura idêntica)
| Coluna | Tipo |
|---|---|
| id | bigint (PK, identity) |
| nome | text NOT NULL |
| data_nascimento | date NOT NULL |
| telefone | text NOT NULL |
| pontuacao_inicial | integer DEFAULT 0 |
| pontuacao_atual | integer DEFAULT 0 |
| criado_em | timestamptz DEFAULT now() |

Índice único: `(nome, telefone)`

### Tabela `presencas_rodada`
| Coluna | Tipo |
|---|---|
| id | bigint (PK, identity) |
| data_rodada | date NOT NULL |
| atleta_id | bigint NOT NULL |
| tipo_atleta | text (`'Linha'` ou `'Goleiro'`) |
| presente | boolean DEFAULT false |
| gols_marcados | integer DEFAULT 0 |
| cartao_amarelo | integer DEFAULT 0 |
| cartao_vermelho | boolean DEFAULT false |
| pontos_ganhos | integer DEFAULT 0 |

Índice único: `(data_rodada, atleta_id, tipo_atleta)`

---

## Convenções de Código

### Server Actions (`/actions`)
- Toda lógica de negócio fica em Server Actions — nunca em Client Components
- Usar `'use server'` no topo de cada arquivo
- Retornar `{ data, error }` padronizado
- Validar inputs antes de tocar no banco

### Componentes (`/components`)
- Componentes de UI puros em Client Components (`'use client'`) quando precisam de estado
- Componentes que apenas exibem dados podem ser Server Components
- PascalCase para arquivos e nomes de componentes

### Supabase Client (`/lib/supabase.ts`)
- Client para Server Actions: `createServerClient` (cookies do Next.js)
- Client para Client Components: `createBrowserClient`
- Nunca expor `SERVICE_ROLE_KEY` no cliente

### Tipos (`/types/index.ts`)
- Definir todos os tipos derivados das tabelas do Supabase
- Usar os tipos gerados pelo CLI do Supabase quando possível

### Tailwind
- Não criar classes CSS customizadas para o que o Tailwind já resolve
- Usar variáveis CSS apenas para o tema de cores (verde/dourado)
- Manter paleta consistente: `#1a5c2e` (verde campo), `#0d2b17` (verde escuro), `#f4c430` (dourado)

---

## Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_ADMIN_PASSWORD=admin123
```

---

## Comandos Úteis

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build de produção
npm run build

# Gerar tipos do Supabase (após configurar CLI)
npx supabase gen types typescript --project-id SEU_PROJECT_ID > types/database.types.ts
```

---

## Autenticação

Senha fixa via `sessionStorage`. O componente `ProtectedRoute` verifica `sessionStorage.getItem('fr_autenticado') === '1'` antes de renderizar páginas administrativas. A senha é comparada com `process.env.NEXT_PUBLIC_ADMIN_PASSWORD`.

Páginas protegidas: `/cadastro`, `/rodada`, `/historico`
Página pública: `/` (ranking)

---

## Deploy

1. Repositório conectado ao Vercel (deploy automático no push para `main`)
2. Variáveis de ambiente configuradas no painel do Vercel
3. Banco Supabase sempre ativo — sem dependência de máquina local

---

## Fora do Escopo (v1)

Não implementar, não sugerir:
- Autenticação completa (Supabase Auth, JWT, sessões)
- Multi-grupo ou multi-campeonato
- App mobile nativo
- Notificações push ou e-mail
- Formação de times por partida
