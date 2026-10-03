import { ErroNegocio, ErroPermissao, falhaDoBanco } from '@/lib/erros';
import { validar } from '@/lib/validacao';
import { clinicaDoUsuario, exigirPermissao, type Contexto } from '@/modules/autenticacao';
import { clinicaService, type Cadeira, type Clinica } from '@/modules/clinica';
import { dentistaService, type Dentista } from '@/modules/dentistas';
import {
  agendamentoIdSchema,
  criarAgendamentoSchema,
  criarBloqueioSchema,
  type Agendamento,
  type BloqueioAgenda,
  type StatusAgendamento,
} from '../types';
import { alertasDoRegistro, type AlertaCalculado } from './regras';

const COLUNAS =
  'id, clinica_id, paciente_id, dentista_id, cadeira_id, procedimento_id, data_hora_inicio, data_hora_fim, status, iniciado_por, concluido_em, emergencia, criado_por';
const NAO_ENCONTRADO = 'Agendamento não encontrado';
const NAO_PODE_INICIAR = 'Agendamento não pode ser iniciado';
const SO_RESPONSAVEL = 'Apenas o dentista responsável ou o Admin pode iniciar o atendimento';
const SO_A_PROPRIA_AGENDA = 'Você só pode bloquear a própria agenda';

const MENSAGENS: Record<string, string> = {
  CADEIRA_OCUPADA: 'Cadeira indisponível nesse horário',
  CADEIRA_INATIVA: 'Cadeira indisponível',
  CADEIRA_NAO_ENCONTRADA: 'Cadeira não encontrada',
  DENTISTA_OCUPADO: 'Dentista indisponível nesse horário',
  DENTISTA_INATIVO: 'Dentista indisponível',
  DENTISTA_NAO_ENCONTRADO: 'Dentista não encontrado',
  PACIENTE_OCUPADO: 'Paciente já possui agendamento nesse horário',
  PACIENTE_NAO_ENCONTRADO: 'Paciente não encontrado',
  PROCEDIMENTO_NAO_ENCONTRADO: 'Procedimento não encontrado',
  FORA_DO_HORARIO: 'Fora do horário de funcionamento',
  DIA_SEM_ATENDIMENTO: 'Clínica não atende nesse dia',
  INTERVALO_INVALIDO: 'O término deve ser depois do início',
};

interface LinhaAgendamento {
  id: string;
  clinica_id: string;
  paciente_id: string;
  dentista_id: string;
  cadeira_id: string;
  procedimento_id: string | null;
  data_hora_inicio: string;
  data_hora_fim: string;
  status: StatusAgendamento;
  iniciado_por: string | null;
  concluido_em: string | null;
  emergencia: boolean;
  criado_por: string;
}

interface LinhaBloqueio {
  id: string;
  clinica_id: string;
  dentista_id: string;
  inicio: string;
  fim: string;
  motivo: string | null;
  criado_por: string;
}

function traduzir(error: { message: string }): never {
  for (const [codigo, texto] of Object.entries(MENSAGENS)) {
    if (error.message.includes(codigo)) throw new ErroNegocio(texto);
  }
  falhaDoBanco('criar agendamento', error);
}

function paraAgendamento(linha: LinhaAgendamento, alertas: AlertaCalculado[]): Agendamento {
  return {
    id: linha.id,
    clinica_id: linha.clinica_id,
    paciente_id: linha.paciente_id,
    dentista_id: linha.dentista_id,
    cadeira_id: linha.cadeira_id,
    ...(linha.procedimento_id ? { procedimento_id: linha.procedimento_id } : {}),
    data_hora_inicio: linha.data_hora_inicio,
    data_hora_fim: linha.data_hora_fim,
    status: linha.status,
    ...(linha.iniciado_por ? { iniciado_por: linha.iniciado_por } : {}),
    ...(linha.concluido_em ? { concluido_em: linha.concluido_em } : {}),
    emergencia: linha.emergencia,
    criado_por: linha.criado_por,
    alertas,
  };
}

function paraBloqueio(linha: LinhaBloqueio): BloqueioAgenda {
  return {
    id: linha.id,
    clinica_id: linha.clinica_id,
    dentista_id: linha.dentista_id,
    inicio: linha.inicio,
    fim: linha.fim,
    ...(linha.motivo ? { motivo: linha.motivo } : {}),
    criado_por: linha.criado_por,
  };
}

async function contextoClinica(ctx: Contexto): Promise<{
  clinica: Clinica;
  cadeiras: Map<string, Cadeira>;
  dentistas: Map<string, Dentista>;
}> {
  const [clinica, cadeiras, dentistas] = await Promise.all([
    clinicaService.obter(ctx),
    clinicaService.listarCadeiras(ctx),
    dentistaService.listar(ctx),
  ]);
  return {
    clinica,
    cadeiras: new Map(cadeiras.map((cadeira) => [cadeira.id, cadeira])),
    dentistas: new Map(dentistas.map((dentista) => [dentista.id, dentista])),
  };
}

function comAlertas(linha: LinhaAgendamento, refs: Awaited<ReturnType<typeof contextoClinica>>): Agendamento {
  const cadeira = refs.cadeiras.get(linha.cadeira_id);
  const dentista = refs.dentistas.get(linha.dentista_id);
  const exibeAlerta = linha.status === 'agendado' || linha.status === 'em_espera' || linha.status === 'iniciado';
  const alertas =
    exibeAlerta && cadeira && dentista
      ? alertasDoRegistro({
          clinica: refs.clinica,
          cadeira,
          dentistaAtivo: dentista.ativo,
          inicio: linha.data_hora_inicio,
          fim: linha.data_hora_fim,
        })
      : [];
  return paraAgendamento(linha, alertas);
}

async function buscarLinha(ctx: Contexto, clinicaId: string, id: string): Promise<LinhaAgendamento | null> {
  const { data, error } = await ctx.db
    .from('agendamentos')
    .select(COLUNAS)
    .eq('id', id)
    .eq('clinica_id', clinicaId)
    .maybeSingle();
  if (error) falhaDoBanco('carregar agendamento', error);
  return data as LinhaAgendamento | null;
}

/** Qualquer papel cria o agendamento. As validações e a concorrência ficam na função SQL. */
export async function criar(ctx: Contexto, entrada: unknown): Promise<Agendamento> {
  exigirPermissao(ctx.usuario, 'agendamento:criar');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const dados = validar(criarAgendamentoSchema, entrada);

  const { data, error } = await ctx.db.rpc('criar_agendamento', {
    p_clinica_id: clinicaId,
    p_paciente_id: dados.paciente_id,
    p_dentista_id: dados.dentista_id,
    p_cadeira_id: dados.cadeira_id,
    p_procedimento_id: dados.procedimento_id ?? null,
    p_inicio: dados.data_hora_inicio,
    p_fim: dados.data_hora_fim,
    p_emergencia: dados.emergencia,
    p_criado_por: ctx.usuario.id,
  });
  if (error) traduzir(error);

  const linha = await buscarLinha(ctx, clinicaId, data as string);
  if (!linha) throw new ErroNegocio(NAO_ENCONTRADO);
  return comAlertas(linha, await contextoClinica(ctx));
}

export async function obter(ctx: Contexto, agendamentoId: unknown): Promise<Agendamento | null> {
  exigirPermissao(ctx.usuario, 'agendamento:ver');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const id = validar(agendamentoIdSchema, agendamentoId);
  const linha = await buscarLinha(ctx, clinicaId, id);
  if (!linha) return null;
  return comAlertas(linha, await contextoClinica(ctx));
}

export async function listar(ctx: Contexto): Promise<Agendamento[]> {
  exigirPermissao(ctx.usuario, 'agendamento:ver');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const { data, error } = await ctx.db
    .from('agendamentos')
    .select(COLUNAS)
    .eq('clinica_id', clinicaId)
    .order('data_hora_inicio', { ascending: true });
  if (error) falhaDoBanco('listar agendamentos', error);
  const refs = await contextoClinica(ctx);
  return (data as LinhaAgendamento[]).map((linha) => comAlertas(linha, refs));
}

/**
 * Dentista responsável ou Admin. Recepcionista é barrada pelo papel.
 * `em_espera` (marcação de chegada, Feature 018) também pode ser iniciado; `concluido` só existe na Feature 010.
 */
export async function iniciar(ctx: Contexto, agendamentoId: unknown): Promise<Agendamento> {
  exigirPermissao(ctx.usuario, 'agendamento:iniciar');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const id = validar(agendamentoIdSchema, agendamentoId);

  const atual = await buscarLinha(ctx, clinicaId, id);
  if (!atual) throw new ErroNegocio(NAO_ENCONTRADO);
  if (atual.status !== 'agendado' && atual.status !== 'em_espera') throw new ErroNegocio(NAO_PODE_INICIAR);

  if (ctx.usuario.papel !== 'admin') {
    const dentista = await dentistaService.obter(ctx, atual.dentista_id);
    if (dentista?.usuario_id !== ctx.usuario.id) throw new ErroNegocio(SO_RESPONSAVEL);
  }

  const { data, error } = await ctx.db
    .from('agendamentos')
    .update({ status: 'iniciado', iniciado_por: ctx.usuario.id })
    .eq('id', id)
    .eq('clinica_id', clinicaId)
    .in('status', ['agendado', 'em_espera'])
    .select(COLUNAS)
    .maybeSingle();
  if (error) falhaDoBanco('iniciar atendimento', error);
  if (!data) throw new ErroNegocio(NAO_PODE_INICIAR);
  return comAlertas(data as LinhaAgendamento, await contextoClinica(ctx));
}

/** Dentista bloqueia a própria agenda; Admin bloqueia a de qualquer dentista da clínica. */
export async function criarBloqueio(ctx: Contexto, entrada: unknown): Promise<BloqueioAgenda> {
  exigirPermissao(ctx.usuario, 'bloqueio:criar');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const dados = validar(criarBloqueioSchema, entrada);

  const dentista = await dentistaService.obter(ctx, dados.dentista_id);
  if (!dentista) throw new ErroNegocio('Dentista não encontrado');
  if (ctx.usuario.papel === 'dentista') {
    const proprio = await dentistaService.obterDoUsuario(ctx);
    if (proprio?.id !== dentista.id) throw new ErroPermissao(SO_A_PROPRIA_AGENDA);
  }

  const { data, error } = await ctx.db
    .from('bloqueios_agenda')
    .insert({
      clinica_id: clinicaId,
      dentista_id: dados.dentista_id,
      inicio: dados.inicio,
      fim: dados.fim,
      motivo: dados.motivo ?? null,
      criado_por: ctx.usuario.id,
    })
    .select('id, clinica_id, dentista_id, inicio, fim, motivo, criado_por')
    .single();
  if (error) falhaDoBanco('criar bloqueio de agenda', error);
  return paraBloqueio(data as LinhaBloqueio);
}

export async function listarBloqueios(ctx: Contexto): Promise<BloqueioAgenda[]> {
  exigirPermissao(ctx.usuario, 'bloqueio:ver');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const { data, error } = await ctx.db
    .from('bloqueios_agenda')
    .select('id, clinica_id, dentista_id, inicio, fim, motivo, criado_por')
    .eq('clinica_id', clinicaId)
    .order('inicio', { ascending: true });
  if (error) falhaDoBanco('listar bloqueios de agenda', error);
  return (data as LinhaBloqueio[]).map(paraBloqueio);
}
