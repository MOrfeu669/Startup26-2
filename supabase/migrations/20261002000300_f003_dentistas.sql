-- Feature 003 — Cadastro de Dentistas
-- Registro do profissional. O login (senha, papel `dentista`, acesso) fica em auth.users + usuarios (Feature 001).
-- Remover um dentista só desativa: agendamentos futuros dele passam a exibir alerta (calculado na Feature 006).

-- Permite a FK composta abaixo: o usuário do dentista precisa ser da mesma clínica.
alter table public.usuarios
  add constraint usuarios_id_clinica_unico unique (id, clinica_id);

create table public.dentistas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null,
  clinica_id uuid not null references public.clinicas (id) on delete restrict,
  nome text not null check (length(trim(nome)) > 0),
  cro text not null check (length(trim(cro)) > 0),
  telefone text not null check (length(trim(telefone)) > 0),
  -- Só os 11 dígitos, sem máscara. Sem unicidade nem dígito verificador: a spec não define.
  cpf text not null,
  -- Informativo: não restringe procedimentos nem agendamentos.
  especialidades text[] not null default '{}',
  -- false após a remoção; o registro nunca é apagado.
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint dentistas_usuario_unico unique (usuario_id),
  constraint dentistas_usuario_clinica_fk foreign key (usuario_id, clinica_id)
    references public.usuarios (id, clinica_id) on delete restrict,
  constraint dentistas_cpf_formato check (cpf ~ '^[0-9]{11}$'),
  constraint dentistas_especialidades_preenchidas check (array_position(especialidades, null) is null)
);

create index dentistas_clinica_idx on public.dentistas (clinica_id);

alter table public.dentistas enable row level security;

-- Reutilizável pelas próximas tabelas que tiverem `atualizado_em`.
create function public.definir_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger dentistas_atualizado_em
  before update on public.dentistas
  for each row execute function public.definir_atualizado_em();
