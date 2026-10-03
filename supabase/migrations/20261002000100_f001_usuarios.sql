-- Feature 001 — Autenticação & Roles
-- Senha, sessão e recuperação ficam no Supabase Auth (auth.users). Esta tabela guarda só papel, clínica e acesso.

create type public.papel_usuario as enum ('admin', 'dentista', 'recepcionista');

create table public.usuarios (
  id uuid primary key references auth.users (id) on delete restrict,
  nome text not null check (length(trim(nome)) > 0),
  email text not null,
  papel public.papel_usuario not null,
  -- Nulo apenas para o Admin que ainda não criou a clínica; a FK para clinicas entra na Feature 002.
  clinica_id uuid,
  -- false após a remoção do acesso; dados clínicos vinculados à clínica não são afetados.
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  constraint usuarios_clinica_obrigatoria_fora_admin check (papel = 'admin' or clinica_id is not null)
);

create unique index usuarios_email_unico on public.usuarios (lower(email));
create index usuarios_clinica_idx on public.usuarios (clinica_id);

-- Acesso a dados só pelo servidor (service role). Sem políticas, os clientes anon/authenticated não leem nada.
alter table public.usuarios enable row level security;
