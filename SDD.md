# SDD.md — Turma do Rola Comary · Software Design Document

> Documento de design de software completo do sistema, com nível de detalhe suficiente para **reconstruir o projeto do zero**. Reflete o estado real do código em 2026-08-22 (verificado arquivo a arquivo), não o PRD original nem os scripts SQL desatualizados que ainda estão no repositório. Onde a implementação diverge do PRD.md, este documento descreve a implementação — é a fonte da verdade.
>
> Para as regras condensadas do dia a dia, ver `CLAUDE.md`. Para o histórico de requisitos de produto (v1, hoje parcialmente desatualizado), ver `PRD.md`.

---

## 1. Visão Geral

Sistema web privado para um grupo de futebol amador ("Turma do Rola - Comary") controlar:

- Cadastro de atletas de linha (não há mais entidade goleiro no produto)
- Registro de presença/estatísticas por rodada (data de jogo) e cálculo automático de pontuação
- Ranking público ordenado por pontuação
- Simulação de escalação balanceada (dois times), com restrições de rivalidade/família e balanceamento por nível + idade
- Histórico de rodadas com edição/exclusão e estorno automático de pontos
- Exportação do ranking em PDF

Não há multiusuário, multi-grupo, autenticação real, nem app mobile — é um sistema single-tenant para um único grupo, protegido por uma senha fixa compartilhada.

---

## 2. Stack e Requisitos

| Camada | Tecnologia | Versão observada |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.6 |
| Runtime UI | React / React DOM | 19.2.4 |
| Linguagem | TypeScript | ^5 |
| Estilização | Tailwind CSS | v4 (via `@tailwindcss/postcss`, config em `@theme` CSS, sem `tailwind.config.*`) |
| Banco de dados | Supabase (PostgreSQL gerenciado) | — |
| Client DB | `@supabase/supabase-js` | ^2.106.2 |
| PDF | `jspdf` + `jspdf-autotable` | ^4.2.1 / ^5.0.8 |
| Deploy | Vercel | — |
| Lint | ESLint (`eslint-config-next`) | ^9 |

Requisitos de ambiente: Node.js compatível com Next 16, npm, uma conta Supabase, uma conta Vercel (opcional para deploy).

> ⚠️ Next.js 16 é recente o suficiente para divergir do conhecimento de treino de um LLM. Ao reconstruir, prefira consultar a documentação oficial (ou `node_modules/next/dist/docs/` após instalar) em vez de assumir APIs do Next 13-15.

---

## 3. Passo a Passo — Reconstruindo do Zero

### 3.1 Criar o projeto

```bash
npx create-next-app@latest futebol-ranking-app \
  --typescript --tailwind --eslint --app --src-dir=false \
  --import-alias "@/*"
cd futebol-ranking-app
```

### 3.2 Instalar dependências adicionais

```bash
npm install @supabase/supabase-js jspdf jspdf-autotable
```

### 3.3 Criar o projeto Supabase

1. Criar um projeto em supabase.com
2. Anotar `Project URL` e `anon public key`
3. Rodar o SQL completo da seção [4. Modelo de Dados](#4-modelo-de-dados-schema-completo-e-atual) no SQL Editor do Supabase
4. Desabilitar RLS nas 3 tabelas (o SQL da seção 4 já faz isso) — não há autenticação por usuário, então RLS não se aplica; a chave anônima precisa de acesso total

### 3.4 Variáveis de ambiente

Criar `futebol-ranking-app/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
NEXT_PUBLIC_ADMIN_PASSWORD=escolha-uma-senha
```

Todas com prefixo `NEXT_PUBLIC_` propositalmente — são lidas tanto em Server Actions/Route Handlers quanto em Client Components. Isso implica que a "senha admin" não é um segredo real (fica no bundle do cliente); é só uma barreira de conveniência (ver seção 9 — Autenticação).

### 3.5 Ordem sugerida de implementação

1. `types/index.ts` — tipos base (seção 5)
2. `lib/supabase.ts` — client único (seção 6)
3. `actions/jogadores.ts` e `actions/rodadas.ts` — Server Actions (seção 7)
4. `app/api/ranking/route.ts` — Route Handler de leitura pública (seção 8.2)
5. `components/ProtectedRoute.tsx`, `components/Navbar.tsx`, `components/ModalConfirmar.tsx` — infra de UI (seção 10)
6. `app/layout.tsx`, `app/globals.css`, `app/manifest.ts` (seção 8.1, 11)
7. `app/page.tsx` (dashboard/ranking)
8. `app/cadastro/page.tsx` + `components/CalibradorModal.tsx`
9. `components/SimuladorCampo.tsx` (o módulo mais complexo — seção 12)
10. `app/rodada/page.tsx` (consome o simulador)
11. `app/historico/page.tsx`
12. `utils/exportPdf.ts`

---

## 4. Modelo de Dados — Schema Completo e Atual

> ⚠️ **Não usar `supabase/schema.sql` nem `supabase/seed.sql` do repositório como referência** — são snapshots de uma versão anterior do produto (ainda criam a tabela `goleiros`, não têm as colunas de idade/atributos/posições preferidas). O SQL abaixo é o schema real, reconstruído a partir do código atual (`types/index.ts` + Server Actions).

```sql
-- ============================================================
-- Turma do Rola Comary — Schema atual (reconstrução a partir do código)
-- ============================================================

create table if not exists jogadores (
  id                  bigint primary key generated always as identity,
  nome                text    not null,
  telefone            text    not null,
  data_nascimento     date,
  idade               integer,
  pontuacao_inicial   integer not null default 0,
  pontuacao_atual     integer not null default 0,
  visao_jogo          integer check (visao_jogo between 1 and 10),
  passe               integer check (passe between 1 and 10),
  preparo_fisico      integer check (preparo_fisico between 1 and 10),
  drible              integer check (drible between 1 and 10),
  chute               integer check (chute between 1 and 10),
  desarme             integer check (desarme between 1 and 10),
  posicoes_preferidas text[],
  criado_em           timestamptz default now(),
  unique (nome, telefone)
);

create table if not exists presencas_rodada (
  id              bigint primary key generated always as identity,
  data_rodada     date    not null,
  atleta_id       bigint  not null,
  tipo_atleta     text    not null default 'Linha' check (tipo_atleta = 'Linha'),
  presente        boolean not null default false,           -- legado, mantido por compatibilidade; usar `status`
  status          text    check (status in ('presente', 'ausente', 'lesionado')),
  gols_marcados   integer not null default 0,
  cartao_amarelo  integer not null default 0,
  cartao_vermelho boolean not null default false,
  pontos_ganhos   integer not null default 0,
  posicao         text    check (posicao in ('DEF', 'MEI', 'ATA')),  -- coluna vestigial, sempre null no fluxo atual
  time            text    check (time in ('A', 'B')),
  unique (data_rodada, atleta_id, tipo_atleta)
);

create table if not exists rodadas (
  id           bigint primary key generated always as identity,
  data_rodada  date not null unique,
  nome_time_a  text,
  nome_time_b  text,
  formacao     text check (formacao in ('3-3-3', '4-3-3', '4-4-3')),
  criado_em    timestamptz default now()
);

create table if not exists substituicoes_rodada (
  id                   bigint primary key generated always as identity,
  data_rodada          date not null,
  time                 text not null check (time in ('A', 'B')),
  atleta_saindo_id     bigint not null,
  tipo_atleta_saindo   text not null default 'Linha' check (tipo_atleta_saindo = 'Linha'),
  atleta_entrando_id   bigint not null,
  tipo_atleta_entrando text not null default 'Linha' check (tipo_atleta_entrando = 'Linha')
);

create index if not exists idx_presencas_data   on presencas_rodada (data_rodada desc);
create index if not exists idx_presencas_atleta on presencas_rodada (atleta_id, tipo_atleta);
create index if not exists idx_subs_data        on substituicoes_rodada (data_rodada);

-- Projeto privado, sem autenticação por usuário — RLS desabilitado propositalmente.
alter table jogadores            disable row level security;
alter table presencas_rodada     disable row level security;
alter table rodadas              disable row level security;
alter table substituicoes_rodada disable row level security;
```

Notas de design:

- **Sem FK declaradas** entre `presencas_rodada.atleta_id` / `substituicoes_rodada.atleta_*_id` e `jogadores.id`. O cascade de exclusão é feito **em código** (`excluir()` em `actions/jogadores.ts` apaga presenças antes de apagar o jogador), não pelo banco. Se for reconstruir com mais rigor, adicionar `references jogadores(id) on delete cascade` é uma melhoria segura — mas não é o comportamento atual documentado.
- `tipo_atleta` (e as colunas irmãs em substituições) hoje só assume `'Linha'`. A constraint acima já reflete isso; a versão antiga do schema aceitava também `'Goleiro'` (legado — ver seção 13).
- `posicao` em `presencas_rodada` e `formacao`/`nome_time_a`/`nome_time_b` em `rodadas` existem e são gravadas, mas hoje carregam sempre os mesmos valores fixos (`null`, `'4-3-3'`, `'Colete'`, `'Sem Colete'`) — são campos vestigiais mantidos por compatibilidade com dados históricos e com o tipo `Formacao`/`Posicao`. Ver seção 12 para o que de fato importa na escalação.

### 4.1 Seed opcional

Para popular jogadores de teste, adaptar:

```sql
insert into jogadores (nome, telefone, data_nascimento, pontuacao_inicial, pontuacao_atual) values
  ('Jogador Um', '00000000001', '1990-01-01', 500, 500),
  ('Jogador Dois', '00000000002', '1992-05-10', 480, 480)
on conflict (nome, telefone) do nothing;
```

---

## 5. Tipos TypeScript (`types/index.ts`)

```ts
export type Atleta = {
  id: number
  nome: string
  telefone: string
  data_nascimento?: string | null
  pontuacao_inicial: number
  pontuacao_atual: number
  criado_em?: string
  visao_jogo?: number | null
  passe?: number | null
  preparo_fisico?: number | null
  drible?: number | null
  chute?: number | null
  desarme?: number | null
  idade?: number | null
  posicoes_preferidas?: string[]
}

export type StatusPresenca = 'presente' | 'ausente' | 'lesionado'
export type Posicao = 'DEF' | 'MEI' | 'ATA'   // legado/vestigial — não é o `Pos` do simulador (seção 12)
export type Formacao = '3-3-3' | '4-3-3' | '4-4-3'  // hoje sempre '4-3-3'

export type PresencaRodada = {
  id?: number
  data_rodada: string
  atleta_id: number
  tipo_atleta: 'Linha'
  presente: boolean
  status?: StatusPresenca
  gols_marcados: number
  cartao_amarelo: number
  cartao_vermelho: boolean
  pontos_ganhos: number
  posicao?: string | null
  time?: string | null
  nome?: string   // preenchido em detalharRodada() via join manual
}

export type PresencaInput = {
  atletaId: number
  tipoAtleta: 'Linha'
  status: StatusPresenca
  golsMarcados: number
  cartaoAmarelo: number
  cartaoVermelho: boolean
  posicao?: Posicao
  time?: 'A' | 'B'
}

export type Substituicao = {
  time: 'A' | 'B'
  atletaSaindoId: number
  tipoAtletaSaindo: 'Linha'
  atletaEntrandoId: number
  tipoAtletaEntrando: 'Linha'
}

export type RodadaResumo = {
  data_rodada: string
  total_presentes: number
  total_gols: number
}

export type ActionResult<T = null> = {
  data?: T
  error: string | null
}
```

Convenção: toda Server Action retorna `Promise<ActionResult<T>>` — nunca lança exceção para o chamador tratar; sempre `{ data, error }`.

---

## 6. Camada de Dados (`lib/supabase.ts`)

```ts
import { createClient } from '@supabase/supabase-js'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
const key = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export const supabase = createClient(url, key)
```

Decisões de design (importantes para não "corrigir" isso incorretamente numa reconstrução):

- **Um único client**, não um par server/browser. É importado tanto por Server Actions (`actions/*.ts`, rodando no servidor) quanto por código que roda no browser (`utils/exportPdf.ts`, e indiretamente por Client Components que chamam Server Actions).
- Não há client autenticado por cookies de sessão de usuário — não existe login de usuário individual, só a senha fixa de `ProtectedRoute` (seção 9), que é ortogonal ao Supabase.
- `clean()` remove um BOM (`﻿`) que aparecia ao colar as chaves de algumas fontes — proteção defensiva contra copy-paste, não um requisito funcional.
- Nunca introduzir aqui a `SERVICE_ROLE_KEY` — o projeto inteiro opera só com a anon key, com RLS desabilitado nas tabelas (não com RLS + service role).

---

## 7. Server Actions

### 7.1 `actions/jogadores.ts`

Todas com `'use server'` no topo.

| Função | Assinatura | Comportamento |
|---|---|---|
| `listarRanking()` | `() => Promise<ActionResult<Atleta[]>>` | `select * from jogadores order by pontuacao_atual desc`; recalcula `idade` a partir de `data_nascimento` via `calcIdade()` local (fallback para `idade` armazenada se não houver data) |
| `cadastrar(form)` | `(form: {nome, telefone, pontuacao_inicial, data_nascimento?}) => Promise<ActionResult>` | Bloqueia duplicata `(nome, telefone)`; grava `idade` calculada; `pontuacao_atual = pontuacao_inicial`; `revalidatePath('/cadastro')` |
| `editar(id, form)` | `(id, form: {..., visao_jogo?, passe?, ..., posicoes_preferidas?}) => Promise<ActionResult>` | Recalcula `pontuacao_atual` pelo delta de `pontuacao_inicial`; valida duplicata excluindo o próprio id; regrava todos os atributos e `posicoes_preferidas` |
| `atualizarAtributo(id, atributo, valor)` | `(id, atributo: string, valor: number) => Promise<ActionResult>` | Valida `atributo` contra whitelist (`visao_jogo, passe, preparo_fisico, drible, chute, desarme`) e `valor` em `[1,10]`; usado pelo `CalibradorModal` para updates incrementais |
| `excluir(id)` | `(id: number) => Promise<ActionResult>` | Apaga `presencas_rodada` do atleta (`tipo_atleta = 'Linha'`) e depois o próprio jogador — cascade manual, não FK |

`calcIdade(dataNasc)`: idade em anos completos, calculada com `Date` local (não depende de bibliotecas de data).

### 7.2 `actions/rodadas.ts`

| Função | Assinatura | Comportamento |
|---|---|---|
| `registrar(dataRodada, presencas, nomeTimeA?, nomeTimeB?, formacao?, substituicoes?)` | ver tipos abaixo | Rejeita se já existe alguma linha em `presencas_rodada` para a data; insere presenças com `pontos_ganhos = calcularPontos(status, cartaoVermelho)`; upsert em `rodadas` (`onConflict: 'data_rodada'`); insere substituições; **soma** `pontos_ganhos` em `jogadores.pontuacao_atual` (não substitui — soma incremental); `revalidatePath('/')` e `('/historico')` |
| `listarHistorico()` | `() => Promise<ActionResult<RodadaResumo[]>>` | Agrupa `presencas_rodada` por `data_rodada`, soma presentes (`status !== 'ausente'`, com fallback para o campo legado `presente`) e gols |
| `detalharRodada(dataRodada)` | `() => Promise<ActionResult<PresencaRodada[]>>` | Busca presenças da data + join manual com `jogadores` (por `id`) para preencher `nome` |
| `carregarRodadaParaEdicao(dataRodada)` | `() => Promise<ActionResult<DadosEdicao>>` | Carrega `rodadas` + `presencas_rodada` + `substituicoes_rodada` da data em paralelo (`Promise.all`) — usado por `app/rodada/page.tsx?data=...` para reabrir uma rodada em modo edição |
| `presencasPorMes(ano, mes)` | `() => Promise<ActionResult<{datas: string[]; porAtleta: Record<string, Record<string, number>>}>>` | Alimenta a grade mensal do dashboard (`app/page.tsx`); filtra por intervalo `[inicio, fim)` de datas |
| `excluirRodada(dataRodada)` | `() => Promise<ActionResult>` | Estorna `pontos_ganhos` de cada presença (`pontuacao_atual - pontos_ganhos`, nunca abaixo de 0), apaga substituições, presenças e a linha de `rodadas`; `revalidatePath('/')` e `('/historico')` |

```ts
function calcularPontos(status: 'presente' | 'ausente' | 'lesionado', cartaoVermelho: boolean): number {
  if (status === 'ausente') return 0
  return cartaoVermelho ? 2 : 3
}
```

Fluxo de **edição de rodada** (ver `app/rodada/page.tsx`): não existe um "update" atômico — a UI chama `excluirRodada(data)` (que estorna e apaga tudo) seguido de `registrar(...)` com os novos dados. Isso implica uma pequena janela sem dados caso o segundo passo falhe; aceitável dado o contexto (uso single-admin, sem concorrência real).

---

## 8. Rotas e Páginas (`app/`)

### 8.1 `app/layout.tsx`

Layout raiz: `<html lang="pt-BR">`, `<Navbar/>` fixo no topo, `metadata` (título, manifest PWA, ícone `Logo.jpg`), `viewport` com `themeColor`.

### 8.2 `app/api/ranking/route.ts`

`GET` Route Handler, `export const dynamic = 'force-dynamic'` (sem cache). Retorna:

```json
{
  "jogadores": [...],
  "ultimaRodada": "2026-08-20",
  "presencasUltima": { "Linha-12": { "presente": true, "pontos_ganhos": 3 }, ... },
  "errors": { "jogadores": null }
}
```

Existe **em paralelo** à Server Action `listarRanking()` — o dashboard usa este endpoint (via `fetch`) para poder fazer `cache: 'no-store'` explícito do lado do client e reportar erros de forma amigável na UI; `utils/exportPdf.ts` também consome este endpoint para montar o PDF.

### 8.3 `app/page.tsx` — Dashboard (público)

- `fetch('/api/ranking', { cache: 'no-store' })` no mount, com estado de loading/erro
- Seletor de mês (◀ / ▶, trava no mês atual) que chama `presencasPorMes(ano, mes)` e monta uma tabela: linhas = atletas ordenados por pontuação, colunas = datas de rodada do mês, célula = ✅ (3 pts) / 🟨 (2 pts, cartão vermelho) / ❌ (0 pts, ausente) / — (sem registro)
- Medalhas 🥇🥈🥉 para as 3 primeiras posições
- Botão "Atualizar ranking" que refaz o fetch

### 8.4 `app/cadastro/page.tsx` — Cadastro (protegido)

Composto por sub-componentes definidos no próprio arquivo (não exportados separadamente):

- `CadastroForm`: nome, telefone, data de nascimento (opcional, mostra idade calculada ao lado), pontuação inicial (opcional)
- `ModalEditar`: mesmos campos + os 6 atributos de habilidade (barras de 10 segmentos, clique para setar 1-10, clique no valor atual desmarca) + seletor de até 5 posições preferidas em ordem de prioridade (chips numerados, removíveis)
- `ListaAtletas`: lista todos os atletas com soma de atributos (`X/60`), selo ✓ quando "completo" (todos os 6 atributos + data de nascimento + ao menos 1 posição preferida), botões editar/excluir
- Botão "Calibrar Habilidades" abre `CalibradorModal` (seção 10.3)

### 8.5 `app/rodada/page.tsx` — Painel da Rodada (protegido)

A página mais complexa da aplicação. Seções, na ordem:

1. **Cabeçalho**: data da rodada (editável só ao criar; travada ao editar via `?data=`)
2. **Presenças**: um card por jogador com botões Presente/Ausente/Lesionado; se presente, mostra inputs de gols, cartão amarelo (contador binário 0/1) e cartão vermelho (toggle)
3. **Escalação**: botão que revela `<SimuladorCampo inline />` (seção 12) só depois de clicado (evita computar sorteios sem necessidade); mostra campinho lado a lado com os 22 titulares
4. **Substituições**: lista dinâmica de pares (time, quem sai, quem entra) — os dropdowns "quem sai" só mostram jogadores escalados naquele time pelo simulador; "quem entra" só mostra presentes não escalados como titulares
5. **2° Tempo**: campinho derivado (`build2ndHalfRows`) aplicando as substituições sobre o resultado do simulador — só aparece se houver ao menos uma substituição completa
6. **Gravar**: monta o payload (`buildPayload()`) e chama `registrar(...)`; se a data já existir, mostra modal de confirmação de sobrescrita (exclui + regrava)

Constantes fixas no topo do arquivo: `NOME_TIME_A = 'Colete'`, `NOME_TIME_B = 'Sem Colete'`, `FORMACAO = '4-3-3'` (ver seção 12 sobre por que isso é vestigial).

Modo de edição: `?data=YYYY-MM-DD` na URL dispara `carregarRodadaParaEdicao()` no mount e popula todo o estado local a partir do banco.

### 8.6 `app/historico/page.tsx` — Histórico (protegido)

Lista de rodadas (`listarHistorico()`) com data, total de presentes e total de gols. Cada linha é expansível (`detalharRodada()`) mostrando cada atleta com presença/gols/cartões/pontos. Botões por rodada: editar (`router.push('/rodada?data=...')`) e excluir (`excluirRodada` + `ModalConfirmar`).

### 8.7 `app/manifest.ts`

PWA manifest via `MetadataRoute.Manifest` — nome, ícone (`Logo.jpg` em dois tamanhos), `display: 'standalone'`, cores de tema.

---

## 9. Autenticação

Não há autenticação real. `components/ProtectedRoute.tsx`:

1. No mount, lê `sessionStorage.getItem('fr_autenticado')`
2. Se `'1'`, renderiza `children`
3. Senão, mostra um formulário de senha; ao submeter, compara com `process.env.NEXT_PUBLIC_ADMIN_PASSWORD` (trim + limpeza de BOM); se igual, seta a sessionStorage e renderiza; senão, mostra erro

Envolve `/cadastro`, `/rodada` e `/historico`. `/` (dashboard) é público, sem o guard.

Limitação conhecida e aceita: por ser `NEXT_PUBLIC_*`, a senha esperada está no bundle JS do cliente. Isso é suficiente para o caso de uso (afastar acesso casual de não-organizadores do grupo), não para segurança real. Não "consertar" isso adicionando JWT/Supabase Auth sem que o usuário peça — está explicitamente fora do escopo v1.

---

## 10. Componentes

### 10.1 `components/Navbar.tsx`
Barra fixa no topo com links para as 4 rotas + botão "📄 PDF" que chama `exportarRankingPdf()` (seção 14) diretamente, sem modal de confirmação.

### 10.2 `components/ModalConfirmar.tsx`
Modal genérico reutilizável: `{ nome, onConfirmar, onFechar }` — usado tanto para excluir atleta quanto para excluir rodada, o `nome` só muda o texto exibido.

### 10.3 `components/CalibradorModal.tsx`
Ferramenta de calibração de atributos por comparação par-a-par (estilo "Elo simplificado"):

1. Sorteia um atributo (dentre os que têm ≥2 jogadores com valor preenchido) e dois jogadores aleatórios com esse atributo preenchido (evita repetir o par imediatamente anterior)
2. Pergunta "quem tem melhor X?" com 3 opções: jogador A, Igual, jogador B
3. `calcularAjuste(rA, rB, resposta)` ajusta ±1 ponto (nunca sai de 1-10): se a resposta já bate com os valores atuais, não mexe; se diverge, aproxima incrementando o vencedor e/ou decrementando o perdedor; "Igual" força os dois para a média arredondada se estavam diferentes
4. Persiste só o que mudou via `atualizarAtributo()`, mostra feedback visual por 1.5s, avança automaticamente para o próximo par
5. Ao fechar, se houve alguma mudança, dispara `onAtualizado()` (recarrega a lista de atletas na página de cadastro)

### 10.4 `components/SimuladorCampo.tsx`
Ver seção 12 (módulo grande o suficiente para seção própria).

---

## 11. Estilo e Tema (Tailwind v4)

`app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-fundo:        #0e1f15;
  --color-card-bg:      #152b1e;
  --color-verde-escuro: #0d2b17;
  --color-verde-campo:  #1a5c2e;
  --color-verde-medio:  #236b35;
  --color-dourado:      #f4c430;
  --color-texto:        #e8f5e2;
  --color-verde-claro:  #8fba85;
  --color-muted:        #cde8c5;
  --font-sans: 'Segoe UI', system-ui, Roboto, sans-serif;
}
```

Não existe `tailwind.config.ts` — todo o design system (paleta verde-campo/dourado, fonte) é declarado via `@theme` direto no CSS (recurso do Tailwind v4). As classes `bg-verde-campo`, `text-dourado`, etc. usadas em toda a UI vêm direto desses tokens. Ao reconstruir, não recriar um `tailwind.config.js` — seguir o padrão v4.

---

## 12. Algoritmo do Simulador de Escalação (`components/SimuladorCampo.tsx`)

Este é o componente com mais lógica de negócio do projeto. Objetivo: dividir N jogadores presentes em dois times de até 11 titulares cada, balanceados por nível e idade, respeitando restrições de pares que devem/não devem ficar juntos, e com um plano de substituições coerente por posição para o "2° tempo".

### 12.1 Tipos e constantes locais

```ts
type Pos = 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA' | 'CA'
const SLOTS_TIME  = { ZAG: 2, LAT: 2, VOL: 2, MEI: 2, ATA: 2, CA: 1 }   // por time (11 titulares)
const SLOTS_TOTAL = { ZAG: 4, LAT: 4, VOL: 4, MEI: 4, ATA: 4, CA: 2 }   // os 2 times somados (22)

// Pares que devem ficar SEMPRE no mesmo time
const PARES_FAMILIA: [string, string][] = [
  ['jacare', 'leandro'],
  ['gustavo', 'alcir'],
  ['elizio', 'victor'],
  ['marcao', 'maurinho'],
  ['duduzinho', 'joao gabriel'],
]

// Pares que NÃO podem ficar no mesmo time
const PARES_RIVAIS: [string, string][] = [
  ['renato', 'carvalho'],
  ['domingos', 'duduzinho'],
  ['boro', 'jorge'],
  ['alcir', 'bideu'],
]
```

`PARES_FAMILIA`/`PARES_RIVAIS` são listas hardcoded de pares de nomes (primeiro nome, comparação por substring normalizada via `norm()` — sem acento, minúsculo, `includes()` — então "Boró" casa com `'boro'`). Não são dado de banco; são particularidades do grupo específico, editadas diretamente no código quando necessário. **Os valores acima são os reais em produção hoje** (copiados de `components/SimuladorCampo.tsx`) — se algum desses nomes mudar de time, entrar/sair do grupo, ou surgir um novo par de rivalidade/família, essas duas constantes precisam ser editadas manualmente no componente (e, idealmente, também atualizadas aqui para manter este documento fiel).

`compositeScore(jogador) = soma(6 atributos, default 5 se null)` — usado para ordenar por "nível" em todo o algoritmo. **Não inclui `pontuacao_atual`**: a pontuação do ranking é presença/participação acumulada ao longo da temporada, não nível de jogo, então não deve influenciar o balanceamento de times. (Uma versão anterior somava `pontuacao_atual + soma(atributos)*2` — foi trocado porque, na prática, a pontuação de presença dominava a conta e os times acabavam divididos por quem mais compareceu, não por quem joga melhor.)

### 12.2 Pipeline de uma simulação (`simular(jogadores)`)

1. Ordena todos os presentes por `compositeScore` desc; **titulares = top 22** (ou todos, se ≤22); **reservas = resto**
2. `assignPositions(titulares)` — atribui uma posição (ZAG/LAT/VOL/MEI/ATA/CA) a cada titular:
   - Escala os slots totais proporcionalmente a `min(n/22, 1)` se houver menos de 22 titulares
   - Ordena titulares por **idade decrescente** (critério de desempate: menos posições preferidas primeiro — quem tem menos flexibilidade é atendido antes)
   - Para cada jogador, tenta encaixar na primeira posição preferida ainda com vaga; se nenhuma preferida tem vaga (ou não declarou preferências), fica pendente
   - Pendentes são distribuídos nas posições restantes na ordem fixa `ZAG,LAT,VOL,MEI,ATA,CA`
3. `distribuirPorPosicao(titulares, posMap)` — para cada posição, embaralha os jogadores daquele grupo **dentro de faixas de score próximas** (`shuffleWithinBands`, banda de 40 pontos) para introduzir variação sem quebrar o balanceamento por nível, depois distribui alternando entre os times em blocos de 2 (`draftSlot`); aplica as restrições de família (mesmo time) e rivalidade (times opostos) propagando um "time pré-atribuído" para o parceiro/rival ainda não processado
4. `distribuirSubs(reservas, timeA, timeB)` — aloca reservas ao time oposto de qualquer rival já escalado, ou ao mesmo time de qualquer parente, com fallback de "menor time primeiro" para equilibrar contagem
5. `criarPares(titulares_do_time, reservas_do_time, posMap)` — casa cada reserva com o titular mais fraco (`compositeScore` asc) da mesma posição preferida quando possível (passe 1); reservas sem match de posição substituem os titulares mais fracos restantes (passe 2) — isso define quem "sai" e quem "entra" no 2° tempo
6. Calcula agregados: `ptsA/ptsB` (soma de `compositeScore`, isto é, soma dos atributos de habilidade dos titulares — **não** de `pontuacao_atual`), `idadeA/idadeB` (média, ignorando nulos), `skillsA/skillsB` (médias dos 6 atributos, default 5)

### 12.3 Otimização — múltiplas tentativas e diversidade

- `balanceScore(resultado) = |ptsA - ptsB| + |idadeA - idadeB| * 10` (menor é melhor; 1 ano de diferença de idade média "pesa" como 10 pontos de nível)
- `contarDiferencas(prev, curr)` — conta quantos jogadores mudaram de time entre dois resultados
- `gerarOpcoes(jogadores, n=5, tentativas=200)`: roda `simular()` 200 vezes, ordena por `balanceScore`, e seleciona greedy as `n` primeiras que diferem em ≥4 jogadores de **todas** as já selecionadas (fallback: completa com o que sobrar se não achar 5 suficientemente diversas)
- "Novo sorteio" no modal refaz `gerarOpcoes()` do zero (não há relação de diversidade forçada contra o sorteio anterior nesse fluxo — a diversidade de 4+ jogadores só é garantida **entre as 5 opções de uma mesma leva**)

### 12.4 Renderização

- `buildRows()` monta 3 linhas de exibição por time (defesa: LAT-ZAG-ZAG-LAT; meio: MEI-VOL-VOL-MEI; ataque: ATA-CA-ATA), marcando `sai`/`entering` para o 1° tempo
- `build2ndHalfRows()` reconstrói o mesmo layout substituindo quem sai pelos pares de substituição, preservando a posição do titular substituído
- Modo `inline` (usado em `/rodada`): mostra as 5 opções em abas + campinho lado a lado, sem 2° tempo (o 2° tempo real da rodada é montado separadamente em `app/rodada/page.tsx` a partir das substituições reais registradas, não das hipotéticas do simulador)
- Modo modal (standalone, não usado atualmente pela página de rodada mas mantido como export): campinho 1° e 2° tempo lado a lado, painel de equilíbrio de habilidades, painel de substituições sugeridas

### 12.5 O que **não** é persistido

Note que o resultado do simulador é **puramente client-side e efêmero**: só a alocação `time` (`A`/`B`) de cada titular é enviada para `registrar()`; posição (ZAG/LAT/...), pares de substituição sugeridos pelo simulador, scores de balanceamento etc. nunca chegam ao banco. As substituições que **são** persistidas em `substituicoes_rodada` vêm de uma UI separada (seção 8.5, item 4), preenchida manualmente pelo organizador — o simulador só ajuda a UI a filtrar quem pode ser selecionado em cada dropdown.

---

## 13. Legado e Dívida Técnica Conhecida

Itens que existem no repositório/banco mas não refletem o comportamento atual — importante para não "reintroduzir" acidentalmente algo removido, e para saber o que ignorar ao ler o código antigo:

1. **Tabela `goleiros`** ainda existe no banco de produção (não foi dropada), mas nenhum código a referencia. Não recriar.
2. **`supabase/schema.sql` e `supabase/seed.sql`** no repo são snapshots antigos (pré-remoção de goleiros, pré-colunas de idade/atributos/posições). Não confiar neles para reconstruir — usar a seção 4 deste documento. Se for fazer uma limpeza, considerar atualizar ou remover esses arquivos para não confundir sessões futuras.
3. **`presencas_rodada.presente`** (boolean) é um campo legado mantido só por compatibilidade com dados antigos; o campo vivo é `status`. `listarHistorico()` já tem fallback (`status ? status !== 'ausente' : presente`).
4. **`presencas_rodada.posicao`** (`DEF`/`MEI`/`ATA`) e **`rodadas.formacao`**/`nome_time_a`/`nome_time_b` continuam sendo gravados, mas sempre com valores fixos/nulos — vestígios de uma versão anterior da UI que permitia escolher formação e nomes de time livremente, e persistir a posição real do simulador. A UI atual não expõe mais esses controles.
5. **`types/index.ts` → `Posicao`/`Formacao`** são os tipos legados correspondentes ao item acima — não confundir com o tipo `Pos` (interno a `SimuladorCampo.tsx`), que é o que de fato importa hoje.
6. **Falta de FK** entre presenças/substituições e `jogadores` — cascades são manuais em código. Uma reconstrução mais rigorosa poderia adicionar FKs com `on delete cascade`, mas isso mudaria o comportamento de `excluir()` (hoje ele apaga presenças manualmente antes) — não fazer essa mudança sem avaliar os dois caminhos.
7. **Edição de rodada não é atômica** (delete + insert em duas chamadas separadas) — ver seção 7.2.

---

## 14. Exportação de PDF (`utils/exportPdf.ts`)

`exportarRankingPdf()`:

1. Importa `jspdf`/`jspdf-autotable` dinamicamente (`await import(...)`) para não engordar o bundle inicial
2. Busca ranking via `GET /api/ranking`
3. Busca direto no Supabase (client do browser, mesma instância de `lib/supabase.ts`) as até 8 últimas datas de rodada distintas e os pontos de cada atleta nelas
4. Monta uma tabela A4 retrato com tema escuro/dourado (cores hardcoded em RGB combinando com a paleta do app): colunas fixas (#, Atleta, Pts Inicial) + uma coluna por rodada (mais antiga → mais recente) + Pts Final; células de rodada coloridas por valor (3=verde, 2=amarelo/cartão vermelho, 0=cinza, sem registro=cinza escuro/"—")
5. Legenda e rodapé fixos; salva como `ranking-turma-rola-DD-MM-AAAA.pdf`

Nota: este é o único ponto do app (além do Route Handler) em que uma consulta ao Supabase acontece fora de uma Server Action, diretamente do browser — aceitável porque é só leitura pública (mesmo dado que `/` já expõe) e a chave usada é a anon key com RLS desabilitado (equivalente em exposição a qualquer outra leitura pública do app).

---

## 15. Deploy

1. Projeto Vercel apontando para o repositório, com **root directory = `futebol-ranking-app/`** (a raiz do repo git não é a raiz do projeto Next.js)
2. Variáveis de ambiente (seção 3.4) configuradas no painel do Vercel, iguais às de `.env.local`
3. Deploy automático a cada push em `main`
4. Sem infraestrutura própria além do Supabase (gerenciado) — nenhuma dependência de servidor local ou cron

---

## 16. Fora de Escopo (deliberado)

Não implementar/sugerir sem pedido explícito do usuário:

- Autenticação completa (Supabase Auth, JWT, sessões, múltiplos usuários com papéis)
- Multi-grupo ou multi-campeonato
- App mobile nativo (o PWA via `manifest.ts` já cobre "instalável" o suficiente para o caso de uso)
- Notificações push ou e-mail
- Persistência real da posição tática (ZAG/LAT/...) ou de nomes de time customizados — hoje são deliberadamente vestigiais (seção 13); reativar isso é uma decisão de produto, não uma correção de bug
