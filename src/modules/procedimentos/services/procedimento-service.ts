import { ErroNegocio, falhaDoBanco } from '@/lib/erros';
import { validar } from '@/lib/validacao';
import { clinicaDoUsuario, exigirPermissao, type Contexto } from '@/modules/autenticacao';
import {
  criarProcedimentoSchema,
  editarProcedimentoSchema,
  procedimentoIdSchema,
  type Procedimento,
} from '../types';
import { ordenarProcedimentos } from './regras';

const COLUNAS = 'id, clinica_id, nome, tempo_medio_minutos, valor_medio';
const NAO_ENCONTRADO = 'Procedimento não encontrado';
const VIOLACAO_FK = '23503';

interface Linha {
  id: string;
  clinica_id: string;
  nome: string;
  tempo_medio_minutos: number;
  valor_medio: number | string;
}

function paraProcedimento(linha: Linha): Procedimento {
  return {
    id: linha.id,
    clinica_id: linha.clinica_id,
    nome: linha.nome,
    tempo_medio_minutos: linha.tempo_medio_minutos,
    valor_medio: Number(linha.valor_medio),
    materiais: [],
  };
}

async function buscar(ctx: Contexto, clinicaId: string, id: string): Promise<Procedimento | null> {
  const { data, error } = await ctx.db
    .from('procedimentos')
    .select(COLUNAS)
    .eq('id', id)
    .eq('clinica_id', clinicaId)
    .maybeSingle();
  if (error) falhaDoBanco('carregar procedimento', error);
  return data ? paraProcedimento(data as Linha) : null;
}

/** Admin ou Dentista cria o procedimento, sem materiais (eles só existem a partir da Feature 017). */
export async function criar(ctx: Contexto, entrada: unknown): Promise<Procedimento> {
  exigirPermissao(ctx.usuario, 'procedimento:criar');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const dados = validar(criarProcedimentoSchema, entrada);

  const { data, error } = await ctx.db
    .from('procedimentos')
    .insert({ ...dados, clinica_id: clinicaId })
    .select(COLUNAS)
    .single();
  if (error) falhaDoBanco('criar procedimento', error);
  return paraProcedimento(data as Linha);
}

export async function editar(ctx: Contexto, procedimentoId: unknown, entrada: unknown): Promise<Procedimento> {
  exigirPermissao(ctx.usuario, 'procedimento:editar');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const id = validar(procedimentoIdSchema, procedimentoId);
  const dados = validar(editarProcedimentoSchema, entrada);

  const { data, error } = await ctx.db
    .from('procedimentos')
    .update(dados)
    .eq('id', id)
    .eq('clinica_id', clinicaId)
    .select(COLUNAS)
    .maybeSingle();
  if (error) falhaDoBanco('editar procedimento', error);
  if (!data) throw new ErroNegocio(NAO_ENCONTRADO);
  return paraProcedimento(data as Linha);
}

/**
 * Só o Admin exclui. Procedimento já referenciado por agendamento não é apagado (a FK restringe).
 * ⚠️ PENDENTE: apagar ou arquivar quando já houve uso — o histórico não é alterado por esta exclusão.
 */
export async function excluir(ctx: Contexto, procedimentoId: unknown): Promise<void> {
  exigirPermissao(ctx.usuario, 'procedimento:excluir');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const id = validar(procedimentoIdSchema, procedimentoId);

  const existente = await buscar(ctx, clinicaId, id);
  if (!existente) throw new ErroNegocio(NAO_ENCONTRADO);

  const { error } = await ctx.db.from('procedimentos').delete().eq('id', id).eq('clinica_id', clinicaId);
  if (error) {
    if (error.code === VIOLACAO_FK) throw new ErroNegocio('Procedimento já utilizado em agendamentos');
    falhaDoBanco('excluir procedimento', error);
  }
}

export async function obter(ctx: Contexto, procedimentoId: unknown): Promise<Procedimento | null> {
  exigirPermissao(ctx.usuario, 'procedimento:ver');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const id = validar(procedimentoIdSchema, procedimentoId);
  return buscar(ctx, clinicaId, id);
}

export async function listar(ctx: Contexto): Promise<Procedimento[]> {
  exigirPermissao(ctx.usuario, 'procedimento:ver');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const { data, error } = await ctx.db.from('procedimentos').select(COLUNAS).eq('clinica_id', clinicaId);
  if (error) falhaDoBanco('listar procedimentos', error);
  return ordenarProcedimentos((data as Linha[]).map(paraProcedimento));
}
