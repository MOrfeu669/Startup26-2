-- Feature 006 — Criar agendamento.
-- A criação roda em criar_agendamento (uma transação). A exclusão por intervalo impede sobreposição
-- mesmo com duas requisições simultâneas. Cancelados e emergências não ocupam cadeira, dentista nem paciente.
-- Fuso provisório America/Sao_Paulo, o mesmo de src/lib/tempo.ts (⚠️ PENDENTE técnico).
-- Recorrência do bloqueio fica de fora: o formato ainda não foi definido.

create extension if not exists btree_gist with schema extensions;

-- A classe de operador do btree_gist fica no schema extensions. Vale só para esta sessão de migration.
set search_path = public, extensions;

create type public.status_agendamento as enum (
  'agendado', 'em_espera', 'iniciado', 'concluido', 'cancelado'
);

alter table public.dentistas
  add constraint dentistas_id_clinica_unico unique (id, clinica_id);

alter table public.cadeiras
  add constraint cadeiras_id_clinica_unico unique (id, clinica_id);

create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas (id) on delete restrict,
  paciente_id uuid not null,
  dentista_id uuid not null,
  cadeira_id uuid not null,
  procedimento_id uuid,
  data_hora_inicio timestamptz not null,
  data_hora_fim timestamptz not null,
  status public.status_agendamento not null default 'agendado',
  iniciado_por uuid references public.usuarios (id) on delete restrict,
  concluido_em timestamptz,
  emergencia boolean not null default false,
  criado_por uuid not null references public.usuarios (id) on delete restrict,
  criado_em timestamptz not null default now(),
  constraint agendamentos_intervalo_valido check (data_hora_fim > data_hora_inicio),
  constraint agendamentos_paciente_clinica_fk foreign key (paciente_id, clinica_id)
    references public.pacientes (id, clinica_id) on delete restrict,
  constraint agendamentos_dentista_clinica_fk foreign key (dentista_id, clinica_id)
    references public.dentistas (id, clinica_id) on delete restrict,
  constraint agendamentos_cadeira_clinica_fk foreign key (cadeira_id, clinica_id)
    references public.cadeiras (id, clinica_id) on delete restrict,
  constraint agendamentos_procedimento_clinica_fk foreign key (procedimento_id, clinica_id)
    references public.procedimentos (id, clinica_id) on delete restrict,
  constraint agendamentos_cadeira_sem_sobreposicao exclude using gist (
    cadeira_id with =,
    tstzrange(data_hora_inicio, data_hora_fim, '[)') with &&
  ) where (status <> 'cancelado' and not emergencia),
  constraint agendamentos_dentista_sem_sobreposicao exclude using gist (
    dentista_id with =,
    tstzrange(data_hora_inicio, data_hora_fim, '[)') with &&
  ) where (status <> 'cancelado' and not emergencia),
  constraint agendamentos_paciente_sem_sobreposicao exclude using gist (
    paciente_id with =,
    tstzrange(data_hora_inicio, data_hora_fim, '[)') with &&
  ) where (status <> 'cancelado' and not emergencia)
);

create index agendamentos_clinica_inicio_idx on public.agendamentos (clinica_id, data_hora_inicio);

-- Bloqueio pontual. Sem coluna de recorrência enquanto o formato estiver ⚠️ PENDENTE.
create table public.bloqueios_agenda (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas (id) on delete restrict,
  dentista_id uuid not null,
  inicio timestamptz not null,
  fim timestamptz not null,
  motivo text,
  criado_por uuid not null references public.usuarios (id) on delete restrict,
  criado_em timestamptz not null default now(),
  constraint bloqueios_intervalo_valido check (fim > inicio),
  constraint bloqueios_dentista_clinica_fk foreign key (dentista_id, clinica_id)
    references public.dentistas (id, clinica_id) on delete restrict
);

create index bloqueios_dentista_idx on public.bloqueios_agenda (dentista_id, inicio);

alter table public.agendamentos enable row level security;
alter table public.bloqueios_agenda enable row level security;

create function public.criar_agendamento(
  p_clinica_id uuid,
  p_paciente_id uuid,
  p_dentista_id uuid,
  p_cadeira_id uuid,
  p_procedimento_id uuid,
  p_inicio timestamptz,
  p_fim timestamptz,
  p_emergencia boolean,
  p_criado_por uuid
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_dias public.dia_semana[];
  v_abertura time;
  v_fechamento time;
  v_inicio_local timestamp;
  v_fim_local timestamp;
  v_dia public.dia_semana;
  v_ativa boolean;
  v_dentista_ativo boolean;
  v_nomes text[] := array['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
begin
  if p_fim <= p_inicio then
    raise exception using errcode = 'P0001', message = 'INTERVALO_INVALIDO';
  end if;

  perform 1 from public.pacientes where id = p_paciente_id and clinica_id = p_clinica_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'PACIENTE_NAO_ENCONTRADO';
  end if;

  select ativo into v_dentista_ativo
  from public.dentistas
  where id = p_dentista_id and clinica_id = p_clinica_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'DENTISTA_NAO_ENCONTRADO';
  end if;

  select ativa into v_ativa
  from public.cadeiras
  where id = p_cadeira_id and clinica_id = p_clinica_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CADEIRA_NAO_ENCONTRADA';
  end if;

  if p_procedimento_id is not null then
    perform 1 from public.procedimentos where id = p_procedimento_id and clinica_id = p_clinica_id;
    if not found then
      raise exception using errcode = 'P0001', message = 'PROCEDIMENTO_NAO_ENCONTRADO';
    end if;
  end if;

  if not p_emergencia then
    if not v_ativa then
      raise exception using errcode = 'P0001', message = 'CADEIRA_INATIVA';
    end if;
    if not v_dentista_ativo then
      raise exception using errcode = 'P0001', message = 'DENTISTA_INATIVO';
    end if;

    select dias_atendimento, horario_abertura, horario_fechamento
      into v_dias, v_abertura, v_fechamento
    from public.clinicas
    where id = p_clinica_id;

    v_inicio_local := p_inicio at time zone 'America/Sao_Paulo';
    v_fim_local := p_fim at time zone 'America/Sao_Paulo';
    v_dia := v_nomes[extract(dow from v_inicio_local)::integer + 1]::public.dia_semana;

    if not (v_dia = any (v_dias)) then
      raise exception using errcode = 'P0001', message = 'DIA_SEM_ATENDIMENTO';
    end if;
    if v_inicio_local::date <> v_fim_local::date
       or v_inicio_local::time < v_abertura
       or v_fim_local::time > v_fechamento then
      raise exception using errcode = 'P0001', message = 'FORA_DO_HORARIO';
    end if;

    if exists (
      select 1 from public.agendamentos a
      where a.cadeira_id = p_cadeira_id
        and a.status <> 'cancelado'
        and not a.emergencia
        and tstzrange(a.data_hora_inicio, a.data_hora_fim, '[)') && tstzrange(p_inicio, p_fim, '[)')
    ) then
      raise exception using errcode = 'P0001', message = 'CADEIRA_OCUPADA';
    end if;

    if exists (
      select 1 from public.bloqueios_agenda b
      where b.dentista_id = p_dentista_id
        and tstzrange(b.inicio, b.fim, '[)') && tstzrange(p_inicio, p_fim, '[)')
    ) or exists (
      select 1 from public.agendamentos a
      where a.dentista_id = p_dentista_id
        and a.status <> 'cancelado'
        and not a.emergencia
        and tstzrange(a.data_hora_inicio, a.data_hora_fim, '[)') && tstzrange(p_inicio, p_fim, '[)')
    ) then
      raise exception using errcode = 'P0001', message = 'DENTISTA_OCUPADO';
    end if;

    if exists (
      select 1 from public.agendamentos a
      where a.paciente_id = p_paciente_id
        and a.status <> 'cancelado'
        and not a.emergencia
        and tstzrange(a.data_hora_inicio, a.data_hora_fim, '[)') && tstzrange(p_inicio, p_fim, '[)')
    ) then
      raise exception using errcode = 'P0001', message = 'PACIENTE_OCUPADO';
    end if;
  end if;

  insert into public.agendamentos (
    clinica_id, paciente_id, dentista_id, cadeira_id, procedimento_id,
    data_hora_inicio, data_hora_fim, emergencia, criado_por
  ) values (
    p_clinica_id, p_paciente_id, p_dentista_id, p_cadeira_id, p_procedimento_id,
    p_inicio, p_fim, p_emergencia, p_criado_por
  )
  returning id into v_id;

  return v_id;
exception
  when exclusion_violation then
    if sqlerrm like '%agendamentos_cadeira_sem_sobreposicao%' then
      raise exception using errcode = 'P0001', message = 'CADEIRA_OCUPADA';
    elsif sqlerrm like '%agendamentos_dentista_sem_sobreposicao%' then
      raise exception using errcode = 'P0001', message = 'DENTISTA_OCUPADO';
    elsif sqlerrm like '%agendamentos_paciente_sem_sobreposicao%' then
      raise exception using errcode = 'P0001', message = 'PACIENTE_OCUPADO';
    else
      raise;
    end if;
end;
$$;

revoke execute on function public.criar_agendamento(uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz, boolean, uuid)
  from public, anon, authenticated;
grant execute on function public.criar_agendamento(uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz, boolean, uuid)
  to service_role;
