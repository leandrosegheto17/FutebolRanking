-- ============================================================
-- Turma do Rola Comary — Schema Supabase
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- Tabela: jogadores
create table if not exists jogadores (
  id               bigint primary key generated always as identity,
  nome             text    not null,
  data_nascimento  date    not null,
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
  data_nascimento  date    not null,
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
  gols_marcados   integer not null default 0,
  cartao_amarelo  integer not null default 0,
  cartao_vermelho boolean not null default false,
  pontos_ganhos   integer not null default 0,
  unique (data_rodada, atleta_id, tipo_atleta)
);

-- Índices para performance
create index if not exists idx_presencas_data      on presencas_rodada (data_rodada desc);
create index if not exists idx_presencas_atleta    on presencas_rodada (atleta_id, tipo_atleta);

-- Desabilitar RLS (projeto privado sem autenticação por usuário)
alter table jogadores       disable row level security;
alter table goleiros        disable row level security;
alter table presencas_rodada disable row level security;

-- Goleiros iniciais
insert into goleiros (nome, data_nascimento, telefone, pontuacao_inicial, pontuacao_atual)
values
  ('Gabriel', '2000-01-01', '00000000000', 0, 0),
  ('Leo',     '2000-01-01', '00000000000', 0, 0),
  ('Thiago',  '2000-01-01', '00000000000', 0, 0),
  ('Renan',   '2000-01-01', '00000000000', 0, 0)
on conflict (nome, telefone) do nothing;
