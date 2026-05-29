# PRD — Turma do Rola Comary · Sistema de Ranking de Futebol

## 1. Visão Geral

Sistema web para gerenciamento do grupo de futebol "Turma do Rola - Comary". Controla presenças, estatísticas por rodada e exibe um ranking atualizado separado por tipo de atleta (jogadores de linha e goleiros).

**Stack:** Next.js 15 (App Router) + Supabase (PostgreSQL) + Vercel

---

## 2. Personas

| Persona | Perfil |
|---|---|
| **Organizador** | Cadastra atletas, registra rodadas, edita e exclui dados. Acesso protegido por senha. |
| **Jogador** | Consulta o ranking e histórico. Acesso público, sem login. |

---

## 3. Histórias de Usuário

### US01 — Cadastro de Jogadores de Linha
**Como** organizador, **quero** cadastrar jogadores de linha com nome, data de nascimento, telefone e pontuação inicial, **para que** eles apareçam nas rodadas e acumulem pontos.

**Critérios de aceitação:**
- Campos obrigatórios: Nome, Data de Nascimento, Telefone
- Campo opcional: Pontuação Inicial (default = 0)
- Bloquear duplicata por Nome + Telefone
- Pontuação Atual inicia igual à Pontuação Inicial

---

### US02 — Cadastro de Goleiros
**Como** organizador, **quero** cadastrar goleiros em tabela separada, **para que** o ranking deles seja independente dos jogadores de linha.

**Critérios de aceitação:**
- Mesmas validações da US01
- Tabela `goleiros` separada da tabela `jogadores`

---

### US03 — Marcação de Presença e Estatísticas da Rodada
**Como** organizador, **quero** registrar presença, gols e cartões de cada atleta por rodada, **para que** o sistema calcule automaticamente os pontos.

**Regras de negócio — Pontuação:**

| Situação | Pontos |
|---|---|
| Ausente (`presente = false`) | 0 |
| Presente sem expulsão | 3 |
| Presente com cartão vermelho | 2 |

**Critérios de aceitação:**
- API recebe lista de atletas com marcações do dia
- Calcula `pontosGanhos` por atleta conforme regras acima
- Soma `pontosGanhos` ao `pontuacaoAtual` de cada atleta
- Não permitir registrar a mesma data de rodada duas vezes

---

### US04 — Ranking
**Como** jogador, **quero** ver a classificação atualizada, **para que** eu acompanhe minha posição no campeonato.

**Critérios de aceitação:**
- Rankings separados: Jogadores de Linha e Goleiros
- Fórmula: `pontuacaoAtual = pontuacaoInicial + Σ pontosGanhos`
- Ordenação decrescente por `pontuacaoAtual`
- Medalhas 🥇🥈🥉 para os três primeiros

---

### US05 — Edição e Exclusão de Atletas (MF01)
**Como** organizador, **quero** editar ou excluir atletas cadastrados, **para que** eu corrija erros sem acessar o banco diretamente.

**Critérios de aceitação:**
- Editar: Nome, Data de Nascimento, Telefone, Pontuação Inicial
- Ao alterar Pontuação Inicial, ajustar Pontuação Atual pelo delta
- Excluir: remove atleta e todas as presenças vinculadas (cascade)
- Validar unicidade Nome + Telefone ao editar
- Interface integrada na tela de Cadastro (lista com botões ✏️ e 🗑️)

---

### US06 — Histórico de Rodadas (MF03)
**Como** organizador, **quero** ver o histórico de rodadas registradas, **para que** eu audite presenças e pontos por jogo.

**Critérios de aceitação:**
- Lista de rodadas com data e totais (presentes, gols)
- Detalhe de cada rodada: todos os atletas com presença, gols, cartões e pontos

---

### US07 — Correção e Exclusão de Rodada (MF02)
**Como** organizador, **quero** excluir uma rodada registrada incorretamente, **para que** os pontos sejam estornados automaticamente.

**Critérios de aceitação:**
- Ao excluir uma rodada: remove presenças e desconta `pontosGanhos` do `pontuacaoAtual` de cada atleta
- Confirmação antes de excluir

---

## 4. Requisitos Funcionais

| ID | Descrição |
|---|---|
| RF01 | Cadastrar, listar, editar e excluir jogadores de linha |
| RF02 | Cadastrar, listar, editar e excluir goleiros |
| RF03 | Registrar rodada com presença e estatísticas por atleta |
| RF04 | Calcular e atualizar pontuação automaticamente ao gravar rodada |
| RF05 | Estornar pontuação ao excluir rodada |
| RF06 | Exibir rankings separados (Linha / Goleiros) ordenados por pontuação |
| RF07 | Listar e detalhar histórico de rodadas |
| RF08 | Exportar ranking em PDF |
| RF09 | Proteger rotas administrativas por senha fixa |

---

## 5. Modelo de Dados (Supabase / PostgreSQL)

### Tabela `jogadores`
| Coluna | Tipo | Observação |
|---|---|---|
| id | bigint (PK, identity) | |
| nome | text | NOT NULL |
| data_nascimento | date | NOT NULL |
| telefone | text | NOT NULL |
| pontuacao_inicial | integer | DEFAULT 0 |
| pontuacao_atual | integer | DEFAULT 0 |
| criado_em | timestamptz | DEFAULT now() |

Índice único: `(nome, telefone)`

### Tabela `goleiros`
Estrutura idêntica a `jogadores`.

### Tabela `presencas_rodada`
| Coluna | Tipo | Observação |
|---|---|---|
| id | bigint (PK, identity) | |
| data_rodada | date | NOT NULL |
| atleta_id | bigint | NOT NULL |
| tipo_atleta | text | `'Linha'` ou `'Goleiro'` |
| presente | boolean | DEFAULT false |
| gols_marcados | integer | DEFAULT 0 |
| cartao_amarelo | integer | DEFAULT 0 |
| cartao_vermelho | boolean | DEFAULT false |
| pontos_ganhos | integer | DEFAULT 0 |

Índice único: `(data_rodada, atleta_id, tipo_atleta)`

---

## 6. Arquitetura Técnica

### Stack
| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Linguagem | TypeScript |
| Estilização | Tailwind CSS |
| Banco | Supabase (PostgreSQL gerenciado) |
| ORM / Client | `@supabase/supabase-js` |
| Deploy | Vercel (frontend + server actions) |
| PDF | `jspdf` + `jspdf-autotable` |

### Estrutura de pastas
```
/
├── app/
│   ├── layout.tsx              # Layout raiz (Navbar)
│   ├── page.tsx                # Dashboard (ranking)
│   ├── cadastro/page.tsx       # Cadastro + lista de atletas
│   ├── rodada/page.tsx         # Painel da rodada
│   ├── historico/page.tsx      # Histórico de rodadas
│   └── api/                    # Route Handlers (se necessário)
├── actions/
│   ├── jogadores.ts            # Server Actions: cadastrar, editar, excluir
│   ├── goleiros.ts             # Server Actions: cadastrar, editar, excluir
│   └── rodadas.ts              # Server Actions: registrar, excluir
├── lib/
│   └── supabase.ts             # Cliente Supabase (server + client)
├── components/
│   ├── Navbar.tsx
│   ├── ProtectedRoute.tsx
│   ├── TabelaRanking.tsx
│   └── ...
├── types/
│   └── index.ts                # Tipos TypeScript (Atleta, Presenca, etc.)
└── utils/
    └── exportPdf.ts
```

### Regra de pontuação (Server Action — nunca no cliente)
```ts
function calcularPontos(presente: boolean, cartaoVermelho: boolean): number {
  if (!presente) return 0
  return cartaoVermelho ? 2 : 3
}
```

---

## 7. Autenticação

Senha fixa (`admin123`) armazenada como variável de ambiente `NEXT_PUBLIC_ADMIN_PASSWORD`. Verificação feita no cliente via `sessionStorage`. Não há sistema de autenticação completo (fora do escopo v1).

---

## 8. Deploy

- **Vercel:** conectado ao repositório GitHub, deploy automático no push para `main`
- **Supabase:** banco PostgreSQL gerenciado, string de conexão via variável de ambiente `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Sem Docker, sem servidor local obrigatório

---

## 9. Fora do Escopo (v1)

- Autenticação completa com login/perfis
- App mobile nativo
- Notificações push ou e-mail
- Histórico de formação de times
- Multi-grupo / multi-campeonato

---

## 10. Backlog Futuro (pós-v1)

| ID | Funcionalidade |
|---|---|
| MF04 | Estatísticas individuais por atleta (gols acumulados, % presença) |
| MF05 | Modo público com URL compartilhável do ranking |
| MF06 | Autenticação real (Supabase Auth) substituindo senha fixa |
