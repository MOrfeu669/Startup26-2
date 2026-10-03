-- Feature 005 — Procedimentos.
-- Tempo e valor são médias. Materiais não existem ainda (Feature 017): os Cenários 1 e 4 ficam de fora.
-- ⚠️ PENDENTE: excluir um procedimento já usado em agendamentos (apagar ou arquivar). A FK da Feature 006
-- usa ON DELETE RESTRICT para não apagar histórico por acidente; a regra de negócio continua em aberto.

create table public.procedimentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas (id) on delete restrict,
  nome text not null check (length(trim(nome)) > 0),
  tempo_medio_minutos integer not null check (tempo_medio_minutos > 0),
  valor_medio numeric(12, 2) not null check (valor_medio >= 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint procedimentos_id_clinica_unico unique (id, clinica_id)
);

create index procedimentos_clinica_idx on public.procedimentos (clinica_id);

alter table public.procedimentos enable row level security;

create trigger procedimentos_atualizado_em
  before update on public.procedimentos
  for each row execute function public.definir_atualizado_em();
