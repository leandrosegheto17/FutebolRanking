-- Liga Row Level Security em todas as tabelas do app, SEM policies.
-- Efeito: a anon key (que é pública no bundle) não lê nem grava nada.
-- O app acessa o banco só pelo servidor, com a service role key, que ignora RLS.
--
-- ⚠️ Rodar no SQL Editor do Supabase SOMENTE DEPOIS que o deploy com
-- SUPABASE_SERVICE_ROLE_KEY estiver no ar na Vercel — antes disso o site para.

alter table public.jogadores            enable row level security;
alter table public.presencas_rodada     enable row level security;
alter table public.rodadas              enable row level security;
alter table public.substituicoes_rodada enable row level security;
alter table public.goleiros             enable row level security;  -- legado, sem uso

-- Conferência: todas devem aparecer com rowsecurity = true
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
