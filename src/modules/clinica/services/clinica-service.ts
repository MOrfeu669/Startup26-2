import type { SupabaseClient } from '@supabase/supabase-js';
import { ErroNegocio, ErroPermissao, falhaDoBanco } from '@/lib/erros';
import { DIAS_SEMANA, type DiaSemana } from '@/lib/tempo';
import { validar } from '@/lib/validacao';
import { clinicaDoUsuario, exigirPermissao, type Contexto } from '@/modules/autenticacao';
import {
  adicionarCadeiraSchema,
  atualizarDiasAtendimentoSchema,
  atualizarHorarioSchema,
  criarClinicaSchema,
  idSchema,
  listarCadeirasSchema,
  type Cadeira,
  type Clinica,
} from '../types';
import { ordenarCadeiras, proximaIdentificacaoCadeira } from './regras';

const COLUNAS_CLINICA = 'id, nome, admin_id, dias_atendimento, horario_abertura, horario_fechamento';
const COLUNAS_CADEIRA = 'id, clinica_id, identificacao, ativa';
const VIOLACAO_UNICA = '23505';
const ADMIN_JA_POSSUI_CLINICA = 'Este Admin já gerencia uma clínica';
const CADEIRA_DUPLICADA = 'Já existe uma cadeira com esta identificação';
const CADEIRA_NAO_ENCONTRADA = 'Cadeira não encontrada';

interface LinhaClinica {
  id: string;
  nome: string;
  admin_id: string;
  dias_atendimento: DiaSemana[];
  horario_abertura: string; // o Postgres devolve "HH:MM:SS"
  horario_fechamento: string;
}

function paraClinica(linha: LinhaClinica, cadeiras: Cadeira[]): Clinica {
  return {
    ...linha,
    dias_atendimento: DIAS_SEMANA.filter((dia) => linha.dias_atendimento.includes(dia)),
    horario_abertura: linha.horario_abertura.slice(0, 5),
    horario_fechamento: linha.horario_fechamento.slice(0, 5),
    cadeiras: ordenarCadeiras(cadeiras),
  };
}

async function buscarCadeiras(db: SupabaseClient, clinicaId: string, apenasAtivas = false): Promise<Cadeira[]> {
  let consulta = db.from('cadeiras').select(COLUNAS_CADEIRA).eq('clinica_id', clinicaId);
  if (apenasAtivas) consulta = consulta.eq('ativa', true);
  const { data, error } = await consulta;
  if (error) falhaDoBanco('listar cadeiras', error);
  return ordenarCadeiras(data as Cadeira[]);
}

async function carregarClinica(db: SupabaseClient, clinicaId: string): Promise<Clinica> {
  const [{ data, error }, cadeiras] = await Promise.all([
    db.from('clinicas').select(COLUNAS_CLINICA).eq('id', clinicaId).maybeSingle(),
    buscarCadeiras(db, clinicaId),
  ]);
  if (error) falhaDoBanco('carregar clínica', error);
  if (!data) throw new ErroNegocio('Clínica não encontrada');
  return paraClinica(data as LinhaClinica, cadeiras);
}

/**
 * Admin sem clínica cria a sua (um Admin = uma clínica), com as cadeiras iniciais "Cadeira 1..N".
 * O `usuarios.clinica_id` do Admin passa a apontar para a clínica; recarregue o usuário da sessão depois.
 */
export async function criar(ctx: Contexto, entrada: unknown): Promise<Clinica> {
  exigirPermissao(ctx.usuario, 'clinica:configurar');
  if (ctx.usuario.clinica_id) throw new ErroNegocio(ADMIN_JA_POSSUI_CLINICA);
  const dados = validar(criarClinicaSchema, entrada);

  const { data: clinicaId, error } = await ctx.db.rpc('criar_clinica', {
    p_admin_id: ctx.usuario.id,
    p_nome: dados.nome,
    p_dias_atendimento: dados.dias_atendimento,
    p_horario_abertura: dados.horario_abertura,
    p_horario_fechamento: dados.horario_fechamento,
    p_quantidade_cadeiras: dados.cadeiras,
  });
  if (error) {
    if (error.message === 'ADMIN_JA_POSSUI_CLINICA' || error.code === VIOLACAO_UNICA) {
      throw new ErroNegocio(ADMIN_JA_POSSUI_CLINICA);
    }
    if (error.message === 'ADMIN_INVALIDO') throw new ErroPermissao();
    falhaDoBanco('criar clínica', error);
  }
  return carregarClinica(ctx.db, clinicaId as string);
}

/** Clínica do usuário autenticado, com todas as cadeiras (ativas e inativas). */
export async function obter(ctx: Contexto): Promise<Clinica> {
  exigirPermissao(ctx.usuario, 'clinica:ver');
  return carregarClinica(ctx.db, clinicaDoUsuario(ctx.usuario));
}

/**
 * Altera o horário único de funcionamento. Agendamentos já marcados não são cancelados:
 * os que ficarem fora do novo horário exibem o aviso "fora de horário" (calculado na Feature 006).
 */
export async function atualizarHorario(ctx: Contexto, entrada: unknown): Promise<Clinica> {
  exigirPermissao(ctx.usuario, 'clinica:configurar');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const dados = validar(atualizarHorarioSchema, entrada);

  const { error } = await ctx.db
    .from('clinicas')
    .update({ horario_abertura: dados.horario_abertura, horario_fechamento: dados.horario_fechamento })
    .eq('id', clinicaId);
  if (error) falhaDoBanco('atualizar horário de funcionamento', error);
  return carregarClinica(ctx.db, clinicaId);
}

export async function atualizarDiasAtendimento(ctx: Contexto, entrada: unknown): Promise<Clinica> {
  exigirPermissao(ctx.usuario, 'clinica:configurar');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const { dias_atendimento } = validar(atualizarDiasAtendimentoSchema, entrada);

  const { error } = await ctx.db.from('clinicas').update({ dias_atendimento }).eq('id', clinicaId);
  if (error) falhaDoBanco('atualizar dias de atendimento', error);
  return carregarClinica(ctx.db, clinicaId);
}

/** Inclui uma cadeira depois da criação. Sem identificação, recebe a próxima "Cadeira N" livre. */
export async function adicionarCadeira(ctx: Contexto, entrada: unknown = {}): Promise<Cadeira> {
  exigirPermissao(ctx.usuario, 'clinica:configurar');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const dados = validar(adicionarCadeiraSchema, entrada);

  let identificacao = dados.identificacao;
  if (!identificacao) {
    const existentes = await buscarCadeiras(ctx.db, clinicaId);
    identificacao = proximaIdentificacaoCadeira(existentes.map((c) => c.identificacao));
  }

  const { data, error } = await ctx.db
    .from('cadeiras')
    .insert({ clinica_id: clinicaId, identificacao })
    .select(COLUNAS_CADEIRA)
    .single();
  if (error) {
    if (error.code === VIOLACAO_UNICA) throw new ErroNegocio(CADEIRA_DUPLICADA);
    falhaDoBanco('adicionar cadeira', error);
  }
  return data as Cadeira;
}

/**
 * Torna a cadeira indisponível para novos agendamentos (validação na Feature 006). Não apaga a cadeira:
 * agendamentos futuros nela continuam existindo e passam a exibir alerta.
 */
export async function desativarCadeira(ctx: Contexto, cadeiraId: unknown): Promise<Cadeira> {
  exigirPermissao(ctx.usuario, 'clinica:configurar');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const id = validar(idSchema, cadeiraId);

  const { data, error } = await ctx.db
    .from('cadeiras')
    .update({ ativa: false })
    .eq('id', id)
    .eq('clinica_id', clinicaId)
    .select(COLUNAS_CADEIRA)
    .maybeSingle();
  if (error) falhaDoBanco('desativar cadeira', error);
  if (!data) throw new ErroNegocio(CADEIRA_NAO_ENCONTRADA);
  return data as Cadeira;
}

/** Cadeira da clínica do usuário; `null` se não existir ou for de outra clínica. */
export async function obterCadeira(ctx: Contexto, cadeiraId: unknown): Promise<Cadeira | null> {
  exigirPermissao(ctx.usuario, 'clinica:ver');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const id = validar(idSchema, cadeiraId);

  const { data, error } = await ctx.db
    .from('cadeiras')
    .select(COLUNAS_CADEIRA)
    .eq('id', id)
    .eq('clinica_id', clinicaId)
    .maybeSingle();
  if (error) falhaDoBanco('carregar cadeira', error);
  return data as Cadeira | null;
}

export async function listarCadeiras(ctx: Contexto, opcoes: unknown = {}): Promise<Cadeira[]> {
  exigirPermissao(ctx.usuario, 'clinica:ver');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const { apenasAtivas } = validar(listarCadeirasSchema, opcoes);
  return buscarCadeiras(ctx.db, clinicaId, apenasAtivas);
}
