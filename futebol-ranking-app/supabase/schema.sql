-- ============================================================
-- Turma do Rola Comary — Schema Supabase
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- Tabela: jogadores
create table if not exists jogadores (
  id               bigint primary key generated always as identity,
  nome             text    not null,
  telefone         text    not null,
  pontuacao_inicial integer not null default 0,
  pontuacao_atual   integer not null default 0,
  criado_em        timestamptz default now(),
  unique (nome, telefone)
);

-- Tabela: goleiros (estrutura idêntica a jogadores)
create table if not exists goleiros (
  id               bigint primary key generated always as identity,
  nome             text    not null,
  telefone         text    not null,
  pontuacao_inicial integer not null default 0,
  pontuacao_atual   integer not null default 0,
  criado_em        timestamptz default now(),
  unique (nome, telefone)
);

-- Tabela: presencas_rodada
create table if not exists presencas_rodada (
  id              bigint primary key generated always as identity,
  data_rodada     date    not null,
  atleta_id       bigint  not null,
  tipo_atleta     text    not null check (tipo_atleta in ('Linha', 'Goleiro')),
  presente        boolean not null default false,
  status          text    check (status in ('presente', 'ausente', 'lesionado')),
  gols_marcados   integer not null default 0,
  cartao_amarelo  integer not null default 0,
  cartao_vermelho boolean not null default false,
  pontos_ganhos   integer not null default 0,
  posicao         text    check (posicao in ('DEF', 'MEI', 'ATA')),
  time            text    check (time in ('A', 'B')),
  unique (data_rodada, atleta_id, tipo_atleta)
);

-- Tabela: rodadas (metadados de cada rodada)
create table if not exists rodadas (
  id           bigint primary key generated always as identity,
  data_rodada  date not null unique,
  nome_time_a  text,
  nome_time_b  text,
  formacao     text check (formacao in ('3-3-3', '4-3-3', '4-4-3')),
  criado_em    timestamptz default now()
);

-- Tabela: substituicoes_rodada
create table if not exists substituicoes_rodada (
  id                   bigint primary key generated always as identity,
  data_rodada          date not null,
  time                 text not null check (time in ('A', 'B')),
  atleta_saindo_id     bigint not null,
  tipo_atleta_saindo   text not null check (tipo_atleta_saindo in ('Linha', 'Goleiro')),
  atleta_entrando_id   bigint not null,
  tipo_atleta_entrando text not null check (tipo_atleta_entrando in ('Linha', 'Goleiro'))
);

-- Índices para performance
create index if not exists idx_presencas_data      on presencas_rodada (data_rodada desc);
create index if not exists idx_presencas_atleta    on presencas_rodada (atleta_id, tipo_atleta);
create index if not exists idx_subs_data           on substituicoes_rodada (data_rodada);

-- Desabilitar RLS (projeto privado sem autenticação por usuário)
alter table jogadores            disable row level security;
alter table goleiros             disable row level security;
alter table presencas_rodada     disable row level security;
alter table rodadas              disable row level security;
alter table substituicoes_rodada disable row level security;
