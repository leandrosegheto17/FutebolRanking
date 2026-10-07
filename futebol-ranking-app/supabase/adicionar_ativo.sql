-- Campo "ativo" em jogadores: false = saiu do grupo.
-- Inativos somem do ranking público e da lista de presença da rodada,
-- mas o histórico de presenças deles continua no banco.
-- Seguro rodar a qualquer momento (todos os atuais ficam ativos).

alter table public.jogadores
  add column if not exists ativo boolean not null default true;
