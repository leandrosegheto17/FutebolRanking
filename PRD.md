# PRD — Sistema de Controle de Presença e Ranking de Futebol

## 1. Visão Geral

Sistema web para gerenciamento de um grupo de futebol amador, cobrindo cadastro de atletas, registro de presenças e estatísticas por rodada, e exibição de ranking atualizado. O sistema distingue jogadores de linha e goleiros em rankings independentes.

---

## 2. Objetivos

- Centralizar o controle de presenças e estatísticas de cada rodada.
- Calcular e atualizar automaticamente a pontuação dos atletas.
- Oferecer uma tabela de classificação em tempo real, separada por tipo de atleta.

---

## 3. Personas

| Persona | Descrição |
|---|---|
| **Organizador** | Responsável por cadastrar atletas e registrar os dados de cada rodada. |
| **Jogador** | Consulta a tabela de classificação para acompanhar sua posição. |

---

## 4. Histórias de Usuário

### US01 — Cadastro de Jogadores de Linha
**Como** organizador,  
**quero** cadastrar jogadores de linha com informações básicas e pontuação inicial,  
**para que** eles possam ser listados nas rodadas e acumular pontos.

**Critérios de aceitação:**
- Campos obrigatórios: Nome, Data de Nascimento, Telefone.
- Campo opcional: Pontuação Inicial (default = 0).
- Persistência na tabela `Jogadores`.
- Bloqueio de duplicatas por Nome + Telefone.

---

### US02 — Cadastro de Goleiros
**Como** organizador,  
**quero** cadastrar goleiros numa estrutura isolada dos jogadores de linha,  
**para que** a gestão e o ranking deles sejam independentes.

**Critérios de aceitação:**
- Mesmas validações de campos da US01.
- Persistência obrigatória na tabela `Goleiros`.

---

### US03 — Marcação de Presença e Estatísticas da Rodada
**Como** organizador,  
**quero** registrar presenças, gols e cartões de cada atleta no dia do jogo,  
**para que** o sistema calcule e atribua automaticamente a pontuação correta.

**Regras de negócio — Pontuação:**

| Situação | Pontos |
|---|---|
| Falta (`Presente = false`) | 0 |
| Presença comum (`Presente = true`, sem expulsão) | 3 |
| Presença com expulsão (`Presente = true`, `CartaoVermelho = true`) | 2 |

**Critérios de aceitação:**
- A API recebe uma lista de atletas com as marcações do dia (Gols, Amarelos, Vermelho, Presença).
- Calcula a pontuação individual conforme as regras acima.
- Soma os pontos ganhos ao campo `PontuacaoAtual` do atleta.

---

### US04 — Consultar Ranking Ordenado
**Como** jogador,  
**quero** visualizar a tabela de classificação atualizada,  
**para que** eu possa acompanhar a liderança do campeonato.

**Critérios de aceitação:**
- Dois endpoints/filtros distintos: Ranking de Linha e Ranking de Goleiros.
- Fórmula: `PontuacaoInicial + Σ PontosGanhos`.
- Retorno ordenado de forma decrescente.

---

## 5. Requisitos Funcionais

| ID | Descrição |
|---|---|
| RF01 | Cadastrar, editar e listar jogadores de linha. |
| RF02 | Cadastrar, editar e listar goleiros. |
| RF03 | Registrar rodada com presença e estatísticas por atleta. |
| RF04 | Calcular pontuação da rodada automaticamente ao gravar. |
| RF05 | Atualizar `PontuacaoAtual` de cada atleta após rodada gravada. |
| RF06 | Expor endpoints de ranking separados (Linha / Goleiros), ordenados por pontuação decrescente. |

---

## 6. Requisitos Não Funcionais

| ID | Descrição |
|---|---|
| RNF01 | Backend em .NET Core seguindo arquitetura DDD. |
| RNF02 | Frontend em ReactJS (componentes funcionais, Hooks, Context API, Axios). |
| RNF03 | Banco de dados PostgreSQL (porta 5432). |
| RNF04 | Ambiente de produção baseado em containers Docker (Linux). |
| RNF05 | Deploy automatizado via CI/CD a partir dos commits nos branches principais. |

---

## 7. Modelo de Dados

### Tabela `Jogadores`
| Campo | Tipo | Descrição |
|---|---|---|
| Id | UUID / Int | Chave Primária |
| Nome | Varchar | Nome do atleta |
| DataNascimento | Date | Data de nascimento |
| Telefone | Varchar | Contato |
| PontuacaoInicial | Int | Pontuação de entrada |
| PontuacaoAtual | Int | Pontuação acumulada |

### Tabela `Goleiros`
Mesma estrutura da tabela `Jogadores`, mantida separada para isolamento de ranking.

### Tabela `PresencasRodada`
| Campo | Tipo | Descrição |
|---|---|---|
| Id | UUID / Int | Chave Primária |
| DataRodada | Date | Data do jogo |
| AtletaId | FK | Referência a Jogadores ou Goleiros |
| TipoAtleta | Enum | `Linha` ou `Goleiro` |
| Presente | Boolean | Compareceu à rodada |
| GolsMarcados | Int | Gols marcados no jogo |
| CartaoAmarelo | Int | Quantidade de cartões amarelos |
| CartaoVermelho | Boolean | Foi expulso |
| PontosGanhos | Int | Pontos calculados para a rodada |

---

## 8. Arquitetura Técnica

### Backend (`/backend`)
```
GrupoFutebol.Domain         → Entidades, Enums, interfaces de repositório, regras de negócio
GrupoFutebol.Application    → Casos de uso, DTOs, Mappers, Serviços de aplicação
GrupoFutebol.Infrastructure → EF Core, Migrations, Repositórios
GrupoFutebol.API            → Controllers, DI, Middleware, Filtros
```

### Frontend (`/frontend`)
| Tela | Descrição |
|---|---|
| **Dashboard de Rankings** | Exibe lado a lado as tabelas de Linha e Goleiros, com destaque para os líderes. |
| **Formulário de Atletas** | Cadastro de atletas com alternância entre tipo Jogador / Goleiro. |
| **Painel da Rodada** | Lista todos os atletas ativos com checkboxes (presença), inputs numéricos (gols) e seletores de cartões. Botão "Gravar e Fechar Rodada". |

### Infraestrutura (`docker-compose.yml`)
| Serviço | Imagem | Descrição |
|---|---|---|
| `db` | `postgres` (oficial) | Banco de dados com persistência em volume |
| `api` | Build .NET Core | API conectada ao serviço `db` |
| `web` | Build ReactJS + Nginx | Frontend servido por Nginx leve |

---

## 9. Roadmap de Fases

| Fase | Escopo |
|---|---|
| **Fase 1** | Arquitetura base: modelagem do banco, backend DDD e endpoints da API (US01–US04). |
| **Fase 2** | Frontend ReactJS: Dashboard, formulário de atletas e painel da rodada. |
| **Fase 3** | Containerização com Docker (multi-stage builds para API e frontend). |
| **Fase 4** | Deploy em provedor Linux (Render / Railway / Fly.io) com banco PostgreSQL gerenciado (Supabase ou equivalente) e CI/CD automatizado. |

---

## 10. Fora do Escopo (v1)

- Autenticação e controle de acesso por perfil.
- Histórico de partidas com times formados.
- Notificações push ou e-mail.
- App mobile nativo.

---

## 11. Melhorias Futuras (backlog pós-v1)

### MF01 — Listagem e Edição de Atletas
**Descrição:** Telas para listar, editar e excluir atletas já cadastrados (jogadores de linha e goleiros).  
**Motivação:** Atualmente só é possível cadastrar. Erros de digitação exigem acesso direto ao banco.  
**Escopo sugerido:**
- Endpoint `PUT /api/jogadores/{id}` e `DELETE /api/jogadores/{id}` (idem goleiros).
- Tela de listagem com busca por nome e ações de editar/excluir.

### MF02 — Correção e Exclusão de Rodada
**Descrição:** Permitir ao organizador corrigir ou remover os dados de uma rodada registrada incorretamente.  
**Motivação:** Hoje não há como desfazer um registro de rodada sem acesso direto ao banco.  
**Escopo sugerido:**
- Endpoint `DELETE /api/rodadas/{data}` que remove as presenças e estorna os pontos dos atletas.
- Tela de histórico com botão de exclusão por rodada.

### MF03 — Histórico de Rodadas
**Descrição:** Visualização das rodadas passadas com data, atletas presentes e pontos ganhos por jogo.  
**Motivação:** Permite acompanhar a evolução individual e auditar o histórico de presença.  
**Escopo sugerido:**
- Endpoint `GET /api/rodadas` retornando datas distintas registradas.
- Endpoint `GET /api/rodadas/{data}` com detalhe por atleta.
- Tela de histórico no frontend com expansão por rodada.
