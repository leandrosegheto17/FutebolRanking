# CLAUDE.md — Grupo Futebol Ranking

## Visão do Projeto

Sistema web para controle de presença, estatísticas e ranking de um grupo de futebol amador. Separa jogadores de linha e goleiros em rankings independentes. Ver `PRD.md` para requisitos completos.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | .NET Core (C#), arquitetura DDD |
| Frontend | ReactJS — componentes funcionais, Hooks, Context API, Axios |
| Banco de dados | PostgreSQL na porta 5432 |
| Infra | Docker + Docker Compose (Linux) |

---

## Estrutura de Pastas

```
/
├── backend/
│   └── src/
│       ├── GrupoFutebol.Domain/         # Entidades, Enums, interfaces de repositório
│       ├── GrupoFutebol.Application/    # Casos de uso, DTOs, Mappers
│       ├── GrupoFutebol.Infrastructure/ # EF Core, Migrations, Repositórios
│       └── GrupoFutebol.API/            # Controllers, DI, Middleware
├── frontend/                            # App React
├── docker-compose.yml
└── PRD.md
```

---

## Regras de Arquitetura DDD (Backend)

- **Domain**: zero dependência de frameworks. Apenas C# puro. Regras de negócio e invariantes ficam aqui.
- **Application**: orquestra Domain e Infrastructure via interfaces. Nunca acessa DbContext diretamente.
- **Infrastructure**: única camada que conhece EF Core e PostgreSQL.
- **API**: apenas controllers finos. Delega tudo para Application. Sem lógica de negócio nos controllers.

Nunca quebrar dependências entre camadas: `API → Application → Domain ← Infrastructure`.

---

## Regras de Negócio Críticas

### Pontuação por Rodada (US03)

```
Presente = false                          → PontosGanhos = 0
Presente = true  AND CartaoVermelho = false → PontosGanhos = 3
Presente = true  AND CartaoVermelho = true  → PontosGanhos = 2
```

Esta lógica deve residir exclusivamente em `GrupoFutebol.Domain`. Nunca no controller ou no frontend.

### Ranking (US04)

```
PontuacaoTotal = PontuacaoInicial + Σ PontosGanhos
```

Retornado em ordem decrescente. Dois endpoints separados: um para Linha, outro para Goleiros.

### Atletas

- Jogadores de linha e goleiros são entidades distintas em tabelas separadas (`Jogadores` e `Goleiros`).
- Nunca misturar os dois tipos num único ranking.
- Duplicata proibida: mesma combinação Nome + Telefone não pode ser cadastrada duas vezes na mesma tabela.
- `PontuacaoInicial` é opcional no cadastro; assume 0 se não informada.

---

## Modelo de Dados

### `Jogadores` e `Goleiros` (estrutura idêntica, tabelas separadas)

| Campo | Tipo |
|---|---|
| Id | UUID ou Int (PK) |
| Nome | Varchar |
| DataNascimento | Date |
| Telefone | Varchar |
| PontuacaoInicial | Int |
| PontuacaoAtual | Int |

### `PresencasRodada`

| Campo | Tipo |
|---|---|
| Id | UUID ou Int (PK) |
| DataRodada | Date |
| AtletaId | FK |
| TipoAtleta | Enum: `Linha` / `Goleiro` |
| Presente | Boolean |
| GolsMarcados | Int |
| CartaoAmarelo | Int |
| CartaoVermelho | Boolean |
| PontosGanhos | Int |

---

## Convenções de Código

### Backend (C#)
- PascalCase para classes, métodos e propriedades.
- Nomes de tabelas e colunas em português conforme o modelo acima.
- Repositórios definidos como interfaces em Domain; implementados em Infrastructure.
- DTOs em Application; nunca expor entidades de Domain diretamente na API.
- Validações de entrada nos DTOs com Data Annotations ou FluentValidation.

### Frontend (React)
- Componentes em PascalCase; arquivos `.jsx` ou `.tsx`.
- Hooks customizados com prefixo `use`.
- Chamadas HTTP centralizadas em arquivos de serviço (`/services`), nunca direto nos componentes.
- Estado global via Context API; sem Redux.

---

## Comandos Úteis

### Backend
```bash
# Rodar a API localmente
dotnet run --project backend/src/GrupoFutebol.API

# Criar/aplicar migrations
dotnet ef migrations add <NomeMigration> --project backend/src/GrupoFutebol.Infrastructure --startup-project backend/src/GrupoFutebol.API
dotnet ef database update --project backend/src/GrupoFutebol.Infrastructure --startup-project backend/src/GrupoFutebol.API
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Docker
```bash
# Subir todos os serviços
docker compose up --build

# Derrubar e limpar volumes
docker compose down -v
```

---

## Conexão com o Banco

- Host: `localhost` (dev) / serviço `db` (Docker)
- Porta: `5432`
- Banco: `futebol_ranking`
- String de conexão configurada via variável de ambiente `DATABASE_URL` ou `ConnectionStrings__Default` no `appsettings`.

---

## Fora do Escopo (v1)

Não implementar, não sugerir:
- Autenticação / login de usuários.
- Histórico de partidas com formação de times.
- Notificações push ou e-mail.
- App mobile nativo.

---

## Melhorias Futuras (backlog pós-v1)

Estas funcionalidades estão planejadas mas ainda não implementadas. Consulte o `PRD.md` seção 11 para detalhes completos.

| ID | Funcionalidade | Resumo |
|---|---|---|
| MF01 | Edição e exclusão de atletas | `PUT/DELETE /api/jogadores/{id}` + tela de listagem com busca |
| MF02 | Correção/exclusão de rodada | Endpoint que remove presenças e estorna pontos + tela de histórico com ação |
| MF03 | Histórico de rodadas | Endpoints `GET /api/rodadas` e `GET /api/rodadas/{data}` + tela no frontend |

Ao implementar MF01, respeitar a regra de unicidade Nome + Telefone e garantir que a exclusão cascade as `PresencasRodada` associadas.
