-- Feature 004 — Cadastro de Pacientes (Visão Geral do prontuário).
-- O paciente não é usuário do sistema. Idade não é gravada: calcula-se a partir de data_nascimento.
-- CPF único por clínica só quando informado. Responsável legal é exigido para menor de 18 no service
-- (CHECK não pode usar a data corrente). ⚠️ PENDENTE: CPF do responsável pode repetir entre pacientes;
-- exportação/importação fica fora do MVP.

create type public.sexo as enum ('masculino', 'feminino', 'outro');
create type public.tipo_canal as enum ('sms', 'email', 'whatsapp');

create table public.pacientes (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas (id) on delete restrict,
  nome text not null check (length(trim(nome)) > 0),
  -- Nulo quando o paciente não informou. Só os 11 dígitos, sem máscara.
  cpf text,
  endereco text,
  data_nascimento date,
  sexo public.sexo,
  responsavel_nome text,
  responsavel_cpf text,
  responsavel_telefone text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint pacientes_id_clinica_unico unique (id, clinica_id),
  constraint pacientes_cpf_formato check (cpf is null or cpf ~ '^[0-9]{11}$'),
  constraint pacientes_data_nascimento_real check (data_nascimento is null or data_nascimento <= '9999-12-31'),
  -- Responsável completo (nome + CPF) ou ausente. Telefone é opcional. Sem unicidade de CPF: ⚠️ PENDENTE.
  constraint pacientes_responsavel_completo check (
    (
      responsavel_nome is null
      and responsavel_cpf is null
      and responsavel_telefone is null
    )
    or (
      responsavel_nome is not null
      and length(trim(responsavel_nome)) > 0
      and responsavel_cpf is not null
      and responsavel_cpf ~ '^[0-9]{11}$'
      and (responsavel_telefone is null or (responsavel_telefone is not null and length(trim(responsavel_telefone)) > 0))
    )
  )
);

-- Único por clínica apenas quando o CPF foi informado.
create unique index pacientes_cpf_unico_por_clinica
  on public.pacientes (clinica_id, cpf)
  where cpf is not null;

create index pacientes_clinica_idx on public.pacientes (clinica_id);

create table public.canais_comunicacao (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null,
  clinica_id uuid not null,
  canal public.tipo_canal not null,
  contato text not null check (length(trim(contato)) > 0),
  preferido boolean not null,
  constraint canais_paciente_clinica_fk foreign key (paciente_id, clinica_id)
    references public.pacientes (id, clinica_id) on delete restrict
);

-- Exatamente um preferido: no máximo um pela unicidade; o mínimo é garantido pela função de gravação.
create unique index canais_um_preferido_por_paciente
  on public.canais_comunicacao (paciente_id)
  where preferido;

create index canais_paciente_idx on public.canais_comunicacao (paciente_id);

alter table public.pacientes enable row level security;
alter table public.canais_comunicacao enable row level security;

create trigger pacientes_atualizado_em
  before update on public.pacientes
  for each row execute function public.definir_atualizado_em();

-- Grava paciente e canais na mesma transação. Pelo menos um canal e exatamente um preferido.
create function public.salvar_paciente(
  p_id uuid,
  p_clinica_id uuid,
  p_nome text,
  p_cpf text,
  p_endereco text,
  p_data_nascimento date,
  p_sexo text,
  p_responsavel_nome text,
  p_responsavel_cpf text,
  p_responsavel_telefone text,
  p_canais jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_total integer;
  v_preferidos integer;
begin
  if p_canais is null or jsonb_typeof(p_canais) <> 'array' or jsonb_array_length(p_canais) < 1 then
    raise exception using errcode = 'P0001', message = 'CANAL_OBRIGATORIO';
  end if;

  if p_id is null then
    insert into public.pacientes (
      clinica_id, nome, cpf, endereco, data_nascimento, sexo,
      responsavel_nome, responsavel_cpf, responsavel_telefone
    )
    values (
      p_clinica_id, p_nome, p_cpf, p_endereco, p_data_nascimento,
      case when p_sexo is null then null else p_sexo::public.sexo end,
      p_responsavel_nome, p_responsavel_cpf, p_responsavel_telefone
    )
    returning id into v_id;
  else
    update public.pacientes set
      nome = p_nome,
      cpf = p_cpf,
      endereco = p_endereco,
      data_nascimento = p_data_nascimento,
      sexo = case when p_sexo is null then null else p_sexo::public.sexo end,
      responsavel_nome = p_responsavel_nome,
      responsavel_cpf = p_responsavel_cpf,
      responsavel_telefone = p_responsavel_telefone
    where id = p_id and clinica_id = p_clinica_id
    returning id into v_id;

    if v_id is null then
      raise exception using errcode = 'P0001', message = 'PACIENTE_NAO_ENCONTRADO';
    end if;

    delete from public.canais_comunicacao where paciente_id = v_id and clinica_id = p_clinica_id;
  end if;

  insert into public.canais_comunicacao (paciente_id, clinica_id, canal, contato, preferido)
  select
    v_id,
    p_clinica_id,
    (item->>'canal')::public.tipo_canal,
    item->>'contato',
    coalesce((item->>'preferido')::boolean, false)
  from jsonb_array_elements(p_canais) as item;

  select count(*), count(*) filter (where preferido)
    into v_total, v_preferidos
  from public.canais_comunicacao
  where paciente_id = v_id;

  if v_total < 1 then
    raise exception using errcode = 'P0001', message = 'CANAL_OBRIGATORIO';
  end if;
  if v_preferidos <> 1 then
    raise exception using errcode = 'P0001', message = 'CANAL_PREFERIDO';
  end if;

  return v_id;
exception
  when unique_violation then
    if sqlerrm like '%pacientes_cpf_unico_por_clinica%' then
      raise exception using errcode = 'P0001', message = 'CPF_DUPLICADO';
    end if;
    raise;
end;
$$;

revoke execute on function public.salvar_paciente(uuid, uuid, text, text, text, date, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.salvar_paciente(uuid, uuid, text, text, text, date, text, text, text, text, jsonb)
  to service_role;
