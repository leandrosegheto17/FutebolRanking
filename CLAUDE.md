# CLAUDE.md — Turma do Rola Comary · Sistema de Ranking

## Visão do Projeto

Sistema web para controle de presença, estatísticas e ranking do grupo de futebol "Turma do Rola - Comary". Ranking único de jogadores de linha (goleiros foram removidos do escopo do produto). Ver `PRD.md` para requisitos completos.

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
│   └── rodadas.ts              # Server Actions de rodadas (registrar, excluir, listarHistorico, detalhar, registrarEscalacao, registrarSubstituicoes)
├── lib/
│   └── supabase.ts             # Clientes Supabase (server + browser)
├── components/
│   ├── Navbar.tsx
│   ├── ProtectedRoute.tsx      # Guard de senha via sessionStorage
│   ├── TabelaRanking.tsx
│   ├── ModalEditar.tsx
│   └── SimuladorCampo.tsx      # Simulador de divisão de times (balanceamento, rivalidade, campinho)
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
function calcularPontos(status: 'presente' | 'ausente' | 'lesionado', cartaoVermelho: boolean): number {
  if (status === 'ausente') return 0
  return cartaoVermelho ? 2 : 3  // lesionado = 3 pts (igual a presente)
}
```

### Ranking
```
pontuacaoAtual = pontuacaoInicial + Σ pontosGanhos
```
Retornado em ordem decrescente. Uma única consulta, tabela `jogadores`.

### Atletas
- Tabela única: `jogadores` (não há mais entidade "goleiro" no sistema)
- Duplicata proibida: índice único em `(nome, telefone)`
- Ao editar `pontuacao_inicial`: ajustar `pontuacao_atual` pelo delta
- Ao excluir atleta: cascade em `presencas_rodada`
- Ao excluir rodada: estornar `pontos_ganhos` de cada atleta

### Escalação (Simulador — `components/SimuladorCampo.tsx`)
- Apenas jogadores com `status = 'presente'` entram no simulador (lesionado e ausente ficam fora)
- O formulário de formação manual foi removido. `Formacao` (`'3-3-3'`/`'4-3-3'`/`'4-4-3'`) ainda existe no tipo e é gravada em `rodadas.formacao`, mas hoje é **fixa em `'4-3-3'`** (`FORMACAO` em `app/rodada/page.tsx`) — campo praticamente vestigial
- Posições reais usadas pelo simulador são outras 6: `'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA' | 'CA'`, com `SLOTS_TIME = { ZAG: 2, LAT: 2, VOL: 2, MEI: 2, ATA: 2, CA: 1 }` por time (11 titulares/time, reduzido proporcionalmente se houver menos presentes); demais presentes viram reservas/suplentes
- **A posição (ZAG/LAT/.../CA) NÃO é persistida no banco** — `presencas_rodada.posicao` é sempre gravado como `undefined`; apenas `time` (`'A'`/`'B'`) é salvo
- `gerarOpcoes()` gera 5 opções de escalação (sorteios) por rodada, cada uma diferindo de pelo menos 4 jogadores das demais, exibidas em abas
- **Balanceamento por idade**: jogadores são ordenados por idade decrescente antes de preencher os slots de posição; o score de qualidade da divisão é `|pontosA - pontosB| + |idadeMediaA - idadeMediaB| * 10` — 1 ano de diferença de idade média pesa como 10 pontos de diferença de nível
- **Variação mínima entre sorteios**: um novo sorteio só é aceito se diferir do anterior (ou das demais opções já geradas) em pelo menos 4 jogadores trocados de time
- **Restrição de rivalidade**: pares de nomes que não podem ficar no mesmo time estão **hardcoded** em `PARES_RIVAIS` (`components/SimuladorCampo.tsx`) — não é um campo/tabela no banco. Há também `PARES_FAMILIA`, o inverso (pares que devem ficar sempre juntos)
- Campinho é renderizado lado a lado (`sideBySide`) no modo inline da página de rodada; "2° Tempo" é uma view derivada (titulares 1° tempo + substituições aplicadas), não persistida separadamente
- Nomes dos times são personalizáveis e armazenados na tabela `rodadas`

### Substituições
- Substituições ocorrem apenas no intervalo
- Quem sai (`atleta_saindo_id`) deve estar na escalação titular do time
- Quem entra (`atleta_entrando_id`) deve ser um jogador com `status = 'presente'` não escalado como titular

---

## Modelo de Dados (Supabase)

### Tabela `jogadores`
| Coluna | Tipo |
|---|---|
| id | bigint (PK, identity) |
| nome | text NOT NULL |
| data_nascimento | date nullable (opcional no cadastro; idade calculada via `calcIdade()`) |
| idade | integer nullable — gravada em `cadastrar`/`editar` a partir de `data_nascimento` |
| telefone | text NOT NULL |
| pontuacao_inicial | integer DEFAULT 0 |
| pontuacao_atual | integer DEFAULT 0 |
| visao_jogo, passe, preparo_fisico, drible, chute, desarme | integer 1-10 nullable — atributos de habilidade (usados em `compositeScore()` do simulador) |
| posicoes_preferidas | text[] nullable — até 5 posições preferidas ordenadas (usadas por `assignPositions()` no simulador) |
| criado_em | timestamptz DEFAULT now() |

Índice único: `(nome, telefone)`

> **Legado**: a tabela `goleiros` e as colunas `tipo_atleta`/`tipo_atleta_saindo`/`tipo_atleta_entrando` = `'Goleiro'` ainda existem no Supabase (não foram removidas do banco), mas nenhum código da aplicação as lê ou escreve mais. Não reintroduzir referências a elas.

### Tabela `presencas_rodada`
| Coluna | Tipo |
|---|---|
| id | bigint (PK, identity) |
| data_rodada | date NOT NULL |
| atleta_id | bigint NOT NULL |
| tipo_atleta | text (sempre `'Linha'`) |
| presente | boolean DEFAULT false (legado) |
| status | text (`'presente'`, `'ausente'`, `'lesionado'`) |
| gols_marcados | integer DEFAULT 0 |
| cartao_amarelo | integer DEFAULT 0 |
| cartao_vermelho | boolean DEFAULT false |
| pontos_ganhos | integer DEFAULT 0 |
| posicao | text nullable (`'DEF'`, `'MEI'`, `'ATA'`) — coluna existe, mas **não é mais gravada** pelo fluxo atual de rodada (sempre `undefined`); posições reais do simulador (ZAG/LAT/VOL/MEI/ATA/CA) não são persistidas |
| time | text nullable (`'A'` ou `'B'`) — único dado de escalação realmente salvo hoje |

Índice único: `(data_rodada, atleta_id, tipo_atleta)`

### Tabela `rodadas`
| Coluna | Tipo |
|---|---|
| id | bigint (PK, identity) |
| data_rodada | date NOT NULL UNIQUE |
| nome_time_a | text |
| nome_time_b | text |
| formacao | text (`'3-3-3'`, `'4-3-3'`, `'4-4-3'`) — hoje sempre gravado como `'4-3-3'` (fixo em código, ver seção Escalação) |
| criado_em | timestamptz DEFAULT now() |

### Tabela `substituicoes_rodada`
| Coluna | Tipo |
|---|---|
| id | bigint (PK, identity) |
| data_rodada | date NOT NULL |
| time | text (`'A'` ou `'B'`) |
| atleta_saindo_id | bigint NOT NULL |
| tipo_atleta_saindo | text (sempre `'Linha'`) |
| atleta_entrando_id | bigint NOT NULL |
| tipo_atleta_entrando | text (sempre `'Linha'`) |

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
