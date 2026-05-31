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
| Ausente (`status = 'ausente'`) | 0 |
| Presente sem expulsão (`status = 'presente'`) | 3 |
| Presente com cartão vermelho | 2 |
| Lesionado (`status = 'lesionado'`) | 3 |

**Critérios de aceitação:**
- API recebe lista de atletas com marcações do dia
- Cada atleta tem status: `presente`, `ausente` ou `lesionado`
- Calcula `pontosGanhos` por atleta conforme regras acima (lesionado = 3 pts)
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

### US08 — Escalação e Substituições da Rodada
**Como** organizador, **quero** definir a escalação dos dois times e as substituições do intervalo, **para que** eu registre a formação tática e movimentação de jogadores de cada partida.

**Critérios de aceitação:**
- O organizador define nomes personalizáveis para os dois times (ex: "Colete" / "Sem Colete")
- Cada jogador de linha com status `presente` recebe uma posição (DEF, MEI ou ATA) e é alocado em um dos dois times
- Jogadores com status `lesionado` ou `ausente` não entram na escalação de nenhum time
- Formações suportadas por time: 3-3-3 (9 jogadores), 4-3-3 (10 jogadores), 4-4-3 (11 jogadores)
- Os goleiros não são contados nas formações — cada time tem 1 goleiro separado
- O organizador pode registrar substituições do intervalo: seleciona o time, quem sai e quem entra
- A página é única (não wizard): seções Informações, Presenças, Escalação e Substituições aparecem na mesma tela

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
| RF10 | Registrar status tripartite de presença: presente / ausente / lesionado |
| RF11 | Registrar posição (DEF/MEI/ATA) e time (A/B) para jogadores escalados |
| RF12 | Registrar substituições de intervalo por time (quem sai → quem entra) |

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
| presente | boolean | DEFAULT false (legado) |
| status | text | `'presente'`, `'ausente'`, `'lesionado'` |
| gols_marcados | integer | DEFAULT 0 |
| cartao_amarelo | integer | DEFAULT 0 |
| cartao_vermelho | boolean | DEFAULT false |
| pontos_ganhos | integer | DEFAULT 0 |
| posicao | text | nullable: `'DEF'`, `'MEI'`, `'ATA'` — só para jogadores escalados |
| time | text | nullable: `'A'` ou `'B'` — time em que o atleta foi escalado |

Índice único: `(data_rodada, atleta_id, tipo_atleta)`

### Tabela `rodadas`
| Coluna | Tipo | Observação |
|---|---|---|
| id | bigint (PK, identity) | |
| data_rodada | date | NOT NULL UNIQUE |
| nome_time_a | text | nome personalizado do Time A |
| nome_time_b | text | nome personalizado do Time B |
| formacao | text | `'3-3-3'`, `'4-3-3'`, `'4-4-3'` |
| criado_em | timestamptz | DEFAULT now() |

### Tabela `substituicoes_rodada`
| Coluna | Tipo | Observação |
|---|---|---|
| id | bigint (PK, identity) | |
| data_rodada | date | NOT NULL |
| time | text | `'A'` ou `'B'` |
| atleta_saindo_id | bigint | NOT NULL |
| tipo_atleta_saindo | text | `'Linha'` ou `'Goleiro'` |
| atleta_entrando_id | bigint | NOT NULL |
| tipo_atleta_entrando | text | `'Linha'` ou `'Goleiro'` |

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
│   └── rodadas.ts              # Server Actions: registrar, excluir, listarHistorico, detalhar, registrarEscalacao, registrarSubstituicoes
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
