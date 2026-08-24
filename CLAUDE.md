# CLAUDE.md — Turma do Rola Comary · Sistema de Ranking

## Visão do Projeto

Sistema web para controle de presença, estatísticas e ranking do grupo de futebol "Turma do Rola - Comary". Ranking único de jogadores de linha (goleiros foram removidos do escopo do produto, mas resíduos ainda existem no banco — ver seção Legado). Ver `SDD.md` para o design completo (passo a passo de reconstrução, schema real, algoritmos) e `PRD.md` para os requisitos originais de produto (histórico, hoje parcialmente desatualizado frente à implementação real).

**Importante**: o código-fonte da aplicação Next.js **não fica na raiz do repositório** — fica em `futebol-ranking-app/`. A raiz só contém `CLAUDE.md`, `PRD.md`, `SDD.md`, `.git` e uma pasta `BackupDotNet/` (versão legada em .NET, não relacionada ao produto atual — ignorar).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) — ver aviso abaixo |
| Linguagem | TypeScript |
| Estilização | Tailwind CSS v4 (`@theme` em `app/globals.css`, sem `tailwind.config`) |
| Banco de dados | Supabase (PostgreSQL gerenciado) |
| Client DB | `@supabase/supabase-js` — **um único client** (sem SSR/cookies), ver seção Supabase Client |
| Deploy | Vercel |
| PDF | `jspdf` + `jspdf-autotable` |

> ⚠️ `futebol-ranking-app/AGENTS.md` (importado pelo `futebol-ranking-app/CLAUDE.md` local via `@AGENTS.md`) avisa que esta versão do Next.js pode ter breaking changes em relação ao conhecimento de treino do modelo. Antes de usar uma API do Next.js que pareça "padrão", vale checar `futebol-ranking-app/node_modules/next/dist/docs/` ou o changelog oficial.

---

## Estrutura de Pastas

```
/                                    # raiz do repositório git
├── CLAUDE.md                       # este arquivo
├── PRD.md                          # requisitos de produto originais (v1, parcialmente desatualizado)
├── SDD.md                          # design doc completo — fonte da verdade para reconstrução
├── BackupDotNet/                   # versão legada em .NET — não faz parte do produto atual
└── futebol-ranking-app/            # ← projeto Next.js real
    ├── AGENTS.md                   # aviso sobre breaking changes do Next.js nesta versão
    ├── CLAUDE.md                   # `@AGENTS.md` (import) — carregado junto com o CLAUDE.md da raiz
    ├── app/
    │   ├── layout.tsx              # Layout raiz: <Navbar/> + metadata + manifest PWA
    │   ├── manifest.ts             # Web App Manifest (PWA), gerado via MetadataRoute.Manifest
    │   ├── globals.css             # Tokens de tema Tailwind v4 (@theme) — cores verde/dourado
    │   ├── page.tsx                # Dashboard (ranking público) — busca via /api/ranking + grade mensal de presença
    │   ├── api/ranking/route.ts    # Route Handler GET — ranking + última rodada (usado pelo dashboard e pelo exportPdf)
    │   ├── cadastro/page.tsx       # Cadastro + lista de atletas (protegido) — inclui ModalEditar inline
    │   ├── rodada/page.tsx         # Painel da rodada (protegido) — presença, simulador, substituições, 2° tempo
    │   └── historico/page.tsx      # Histórico de rodadas (protegido)
    ├── actions/
    │   ├── jogadores.ts            # 'use server': listarRanking, cadastrar, editar, atualizarAtributo, excluir
    │   └── rodadas.ts              # 'use server': registrar, listarHistorico, detalharRodada, carregarRodadaParaEdicao, presencasPorMes, excluirRodada
    ├── lib/
    │   └── supabase.ts             # Único client Supabase (anon key) — usado por Server Actions E por Client Components
    ├── components/
    │   ├── Navbar.tsx              # Links + botão "Exportar PDF" (chama utils/exportPdf)
    │   ├── ProtectedRoute.tsx      # Guard de senha via sessionStorage
    │   ├── SimuladorCampo.tsx      # Simulador de divisão de times (balanceamento, rivalidade, campinho) — ver SDD.md
    │   ├── CalibradorModal.tsx     # Comparação par-a-par para calibrar atributos (visão, passe, etc.) de 1-10
    │   └── ModalConfirmar.tsx      # Modal genérico de confirmação de exclusão
    ├── types/
    │   └── index.ts                # Atleta, PresencaRodada, PresencaInput, Substituicao, RodadaResumo, ActionResult, etc.
    ├── utils/
    │   └── exportPdf.ts            # Gera PDF do ranking (jsPDF) — consulta Supabase direto do client
    └── supabase/
        ├── schema.sql              # ⚠️ DESATUALIZADO — não reflete o schema real em produção (ver Legado)
        └── seed.sql                # ⚠️ DESATUALIZADO — seed antigo, sem as colunas novas
```

> `ModalEditar` (edição de atleta) e a tabela de ranking (`TabelaRanking`) **não são arquivos separados** — estão implementados como componentes internos de `app/cadastro/page.tsx` e `app/page.tsx`, respectivamente. Não criar `components/ModalEditar.tsx` ou `components/TabelaRanking.tsx` esperando encontrar código lá.

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
Retornado em ordem decrescente. O dashboard (`app/page.tsx`) busca isso via `GET /api/ranking` (Route Handler), não chamando `listarRanking()` diretamente — motivo: permitir `fetch(..., { cache: 'no-store' })` e devolver junto metadados da última rodada. `listarRanking()` (Server Action) é reservado para outros consumidores (`CalibradorModal`, `ListaAtletas` em `/cadastro`).

O dashboard também mostra uma **grade mensal** (rodadas do mês corrente/navegável x pontos por atleta), alimentada por `presencasPorMes(ano, mes)` em `actions/rodadas.ts`.

### Atletas
- Tabela única: `jogadores` (não há mais entidade "goleiro" no sistema)
- Duplicata proibida: índice único em `(nome, telefone)`
- Ao editar `pontuacao_inicial`: ajustar `pontuacao_atual` pelo delta
- Ao excluir atleta: cascade manual em `presencas_rodada` (feito em código, `excluir()` em `actions/jogadores.ts` — não é FK `ON DELETE CASCADE` no banco)
- Ao excluir rodada: estornar `pontos_ganhos` de cada atleta (`excluirRodada()`)
- `atualizarAtributo(id, atributo, valor)` atualiza um único atributo de habilidade (1-10) — usado pelo `CalibradorModal`

### Escalação (Simulador — `components/SimuladorCampo.tsx`)
- Apenas jogadores com `status = 'presente'` entram no simulador (lesionado e ausente ficam fora)
- O formulário de formação manual foi removido. `Formacao` (`'3-3-3'`/`'4-3-3'`/`'4-4-3'`) ainda existe no tipo e é gravada em `rodadas.formacao`, mas hoje é **fixa em `'4-3-3'`** (`FORMACAO` em `app/rodada/page.tsx`) — campo praticamente vestigial. **Os nomes dos times também estão fixos em código** (`NOME_TIME_A = 'Colete'`, `NOME_TIME_B = 'Sem Colete'` em `app/rodada/page.tsx`), embora a coluna `rodadas.nome_time_a/b` continue existindo e sendo gravada — não há mais input de UI para personalizá-los
- Posições reais usadas pelo simulador são outras 6 (tipo local `Pos` em `SimuladorCampo.tsx`, **não** o `Posicao` de `types/index.ts`, que é legado/não usado pelo simulador): `'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA' | 'CA'`, com `SLOTS_TIME = { ZAG: 2, LAT: 2, VOL: 2, MEI: 2, ATA: 2, CA: 1 }` por time (11 titulares/time, escalado proporcionalmente se houver menos de 22 presentes); os demais presentes (acima de 22) viram reservas/suplentes
- **A posição (ZAG/LAT/.../CA) NÃO é persistida no banco** — `presencas_rodada.posicao` é sempre gravado como `null`; apenas `time` (`'A'`/`'B'`) é salvo
- `gerarOpcoes()` gera 5 opções de escalação (sorteios) por rodada, cada uma diferindo de pelo menos 4 jogadores das demais, exibidas em abas
- **Balanceamento por idade**: jogadores são ordenados por idade decrescente antes de preencher os slots de posição; o score de qualidade da divisão (`balanceScore`) é `|pontosA - pontosB| + |idadeMediaA - idadeMediaB| * 10` — 1 ano de diferença de idade média pesa como 10 pontos de diferença de nível
- **Variação mínima entre sorteios**: um novo sorteio só é aceito se diferir do anterior (ou das demais opções já geradas) em pelo menos 4 jogadores trocados de time (`contarDiferencas`)
- **Restrição de rivalidade/família**: pares de nomes hardcoded em `PARES_RIVAIS` (times opostos obrigatórios) e `PARES_FAMILIA` (mesmo time obrigatório) dentro de `components/SimuladorCampo.tsx` — não é campo/tabela no banco. O matching é por substring normalizada do primeiro nome (`norm()`), não por `atleta_id`
- Campinho é renderizado lado a lado (`sideBySide`) no modo inline da página de rodada; "2° Tempo" é uma view derivada (titulares 1° tempo + substituições aplicadas via `build2ndHalfRows`), não persistida separadamente
- Titulares = top 22 por `compositeScore` (pontuação atual + soma dos 6 atributos × 2); reservas = restante

### Substituições
- Substituições ocorrem apenas no intervalo
- Quem sai (`atleta_saindo_id`) deve estar na escalação titular do time
- Quem entra (`atleta_entrando_id`) deve ser um jogador com `status = 'presente'` não escalado como titular
- Persistidas em `substituicoes_rodada`; ao editar uma rodada, `carregarRodadaParaEdicao()` recarrega tanto presenças quanto substituições

---

## Modelo de Dados (Supabase)

> Este é o schema **real usado pelo código** (verificado em `types/index.ts` e nas Server Actions). Os arquivos `supabase/schema.sql` e `supabase/seed.sql` no repo estão **desatualizados** — ainda criam a tabela `goleiros` e não têm as colunas abaixo. Se for recriar o banco do zero, use o SQL completo em `SDD.md`, não o `schema.sql` do repo.

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
| visao_jogo, passe, preparo_fisico, drible, chute, desarme | integer 1-10 nullable — atributos de habilidade (usados em `compositeScore()` do simulador e no `CalibradorModal`) |
| posicoes_preferidas | text[] nullable — até 5 posições preferidas ordenadas (usadas por `assignPositions()` no simulador) |
| criado_em | timestamptz DEFAULT now() |

Índice único: `(nome, telefone)`

> **Legado**: a tabela `goleiros` e as colunas `tipo_atleta`/`tipo_atleta_saindo`/`tipo_atleta_entrando` = `'Goleiro'` ainda existem no Supabase em produção (não foram removidas do banco), mas nenhum código da aplicação as lê ou escreve mais. Não reintroduzir referências a elas. Os arquivos `supabase/schema.sql` e `supabase/seed.sql` no repo são snapshots antigos de antes dessa remoção — não os execute contra o banco de produção esperando que reflitam o estado atual.

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
| posicao | text nullable (`'DEF'`, `'MEI'`, `'ATA'`) — coluna existe, mas **não é mais gravada** pelo fluxo atual de rodada (sempre `null`); posições reais do simulador (ZAG/LAT/VOL/MEI/ATA/CA) não são persistidas |
| time | text nullable (`'A'` ou `'B'`) — único dado de escalação realmente salvo hoje |

Índice único: `(data_rodada, atleta_id, tipo_atleta)`

### Tabela `rodadas`
| Coluna | Tipo |
|---|---|
| id | bigint (PK, identity) |
| data_rodada | date NOT NULL UNIQUE |
| nome_time_a | text — hoje sempre `'Colete'` (constante fixa em `app/rodada/page.tsx`) |
| nome_time_b | text — hoje sempre `'Sem Colete'` (idem) |
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
- Toda lógica de negócio fica em Server Actions — nunca em Client Components (exceção conhecida: `utils/exportPdf.ts` e `CalibradorModal.tsx` fazem leituras diretas via o client Supabase do browser — ver seção Supabase Client)
- Usar `'use server'` no topo de cada arquivo
- Retornar `{ data, error }` padronizado (`ActionResult<T>`)
- Validar inputs antes de tocar no banco

### Componentes (`/components`)
- Componentes de UI puros em Client Components (`'use client'`) quando precisam de estado — hoje **todos** os componentes e páginas do projeto são Client Components
- PascalCase para arquivos e nomes de componentes

### Supabase Client (`/lib/supabase.ts`)
- Existe **um único client**, exportado como `supabase`, criado com `createClient(url, anonKey)` — não há distinção entre client de servidor (cookies) e client de browser
- Esse mesmo client é importado tanto pelas Server Actions (`actions/*.ts`) quanto por código que roda no browser (`utils/exportPdf.ts`, `components/CalibradorModal.tsx` via a Server Action, o Route Handler `app/api/ranking/route.ts`)
- RLS está **desabilitado** em todas as tabelas (projeto privado, sem autenticação por usuário) — a chave anônima tem acesso total de leitura/escrita
- Nunca expor `SERVICE_ROLE_KEY` no cliente (hoje o projeto nem usa service role — só anon key)

### Tipos (`/types/index.ts`)
- Definir todos os tipos derivados das tabelas do Supabase
- `Posicao` (`'DEF'|'MEI'|'ATA'`) e `Formacao` são tipos legados/vestigiais mantidos por compatibilidade com a coluna `presencas_rodada.posicao` e `rodadas.formacao` — **não confundir** com o tipo `Pos` (ZAG/LAT/VOL/MEI/ATA/CA) usado de fato pelo simulador, que é definido localmente em `SimuladorCampo.tsx`

### Tailwind
- Tailwind v4 — configuração via `@theme` em `app/globals.css`, não há `tailwind.config.ts`
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

Definidas em `futebol-ranking-app/.env.local` (não versionado). Todas com prefixo `NEXT_PUBLIC_` porque são lidas tanto no servidor quanto no browser — não há segredo real protegido aqui (ver Autenticação).

---

## Comandos Úteis

Executar sempre dentro de `futebol-ranking-app/`:

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build de produção
npm run build

# Lint
npm run lint

# Gerar tipos do Supabase (após configurar CLI) — hoje não usado no projeto, mas disponível
npx supabase gen types typescript --project-id SEU_PROJECT_ID > types/database.types.ts
```

---

## Autenticação

Senha fixa via `sessionStorage`. O componente `ProtectedRoute` verifica `sessionStorage.getItem('fr_autenticado') === '1'` antes de renderizar páginas administrativas. A senha é comparada com `process.env.NEXT_PUBLIC_ADMIN_PASSWORD` — como a variável é `NEXT_PUBLIC_*`, ela é embutida no bundle do cliente; isso é uma limitação conhecida e aceita (não é um controle de segurança real, só uma barreira de conveniência contra acesso casual).

Páginas protegidas: `/cadastro`, `/rodada`, `/historico`
Página pública: `/` (ranking)

---

## Deploy

1. Repositório conectado ao Vercel (deploy automático no push para `main`), com **root directory = `futebol-ranking-app/`** no painel do Vercel (`vercel.json` local só declara `framework: nextjs`)
2. Variáveis de ambiente configuradas no painel do Vercel
3. Banco Supabase sempre ativo — sem dependência de máquina local

---

## Fora do Escopo (v1)

Não implementar, não sugerir:
- Autenticação completa (Supabase Auth, JWT, sessões)
- Multi-grupo ou multi-campeonato
- App mobile nativo
- Notificações push ou e-mail
