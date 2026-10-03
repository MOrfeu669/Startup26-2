-- Feature 002 — Criar/Configurar Clínica
-- Horário de funcionamento único para todos os dias de atendimento. Os avisos "cadeira indisponível" e
-- "fora de horário" nos agendamentos são calculados (Feature 006), não gravados aqui.

create type public.dia_semana as enum ('domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado');

create table public.clinicas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  -- Um Admin gerencia exatamente uma clínica.
  admin_id uuid not null references public.usuarios (id) on delete restrict,
  dias_atendimento public.dia_semana[] not null,
  horario_abertura time not null default '08:00',
  horario_fechamento time not null default '18:00',
  criado_em timestamptz not null default now(),
  constraint clinicas_admin_unico unique (admin_id),
  constraint clinicas_horario_valido check (horario_abertura < horario_fechamento),
  constraint clinicas_dias_atendimento_preenchido check (
    cardinality(dias_atendimento) > 0 and array_position(dias_atendimento, null) is null
  )
);

create table public.cadeiras (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas (id) on delete restrict,
  identificacao text not null check (length(trim(identificacao)) > 0),
  -- Desativar não apaga: agendamentos futuros na cadeira passam a exibir alerta.
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

create unique index cadeiras_identificacao_unica on public.cadeiras (clinica_id, lower(identificacao));

alter table public.usuarios
  add constraint usuarios_clinica_fk foreign key (clinica_id) references public.clinicas (id) on delete restrict;

alter table public.clinicas enable row level security;
alter table public.cadeiras enable row level security;

-- Cria a clínica, as cadeiras iniciais ("Cadeira 1..N") e vincula o Admin, numa única transação.
create function public.criar_clinica(
  p_admin_id uuid,
  p_nome text,
  p_dias_atendimento public.dia_semana[],
  p_horario_abertura time,
  p_horario_fechamento time,
  p_quantidade_cadeiras integer
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_admin record;
  v_clinica_id uuid;
begin
  select papel, ativo, clinica_id into v_admin
  from public.usuarios
  where id = p_admin_id
  for update;

  if not found or v_admin.papel <> 'admin' or not v_admin.ativo then
    raise exception using errcode = 'P0001', message = 'ADMIN_INVALIDO';
  end if;
  if v_admin.clinica_id is not null then
    raise exception using errcode = 'P0001', message = 'ADMIN_JA_POSSUI_CLINICA';
  end if;

  insert into public.clinicas (nome, admin_id, dias_atendimento, horario_abertura, horario_fechamento)
  values (p_nome, p_admin_id, p_dias_atendimento, p_horario_abertura, p_horario_fechamento)
  returning id into v_clinica_id;

  insert into public.cadeiras (clinica_id, identificacao)
  select v_clinica_id, 'Cadeira ' || n
  from generate_series(1, coalesce(p_quantidade_cadeiras, 0)) as n;

  update public.usuarios set clinica_id = v_clinica_id where id = p_admin_id;

  return v_clinica_id;
end;
$$;

revoke execute on function public.criar_clinica(uuid, text, public.dia_semana[], time, time, integer)
  from public, anon, authenticated;
grant execute on function public.criar_clinica(uuid, text, public.dia_semana[], time, time, integer)
  to service_role;
