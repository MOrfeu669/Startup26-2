import { ErroNegocio, falhaDoBanco } from '@/lib/erros';
import { validar } from '@/lib/validacao';
import {
  authService,
  clinicaDoUsuario,
  desfazerCadastroUsuario,
  exigirPermissao,
  type Contexto,
} from '@/modules/autenticacao';
import {
  cadastrarDentistaSchema,
  dentistaIdSchema,
  editarDentistaSchema,
  listarDentistasSchema,
  type Dentista,
} from '../types';
import { ordenarDentistas } from './regras';

const COLUNAS = 'id, usuario_id, clinica_id, nome, cro, telefone, cpf, especialidades, ativo';
const DENTISTA_NAO_ENCONTRADO = 'Dentista não encontrado';

async function buscar(ctx: Contexto, clinicaId: string, id: string): Promise<Dentista | null> {
  const { data, error } = await ctx.db
    .from('dentistas')
    .select(COLUNAS)
    .eq('id', id)
    .eq('clinica_id', clinicaId)
    .maybeSingle();
  if (error) falhaDoBanco('carregar dentista', error);
  return data as Dentista | null;
}

/**
 * Admin cadastra o dentista na própria clínica e o login dele (papel `dentista`, Feature 001).
 * Se o registro do dentista falhar, o usuário recém-criado é desfeito para não sobrar login sem cadastro.
 */
export async function cadastrar(ctx: Contexto, entrada: unknown): Promise<Dentista> {
  exigirPermissao(ctx.usuario, 'dentista:cadastrar');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const { email_login, senha, ...dados } = validar(cadastrarDentistaSchema, entrada);

  const usuario = await authService.cadastrarUsuario(ctx, {
    nome: dados.nome,
    email: email_login,
    senha,
    papel: 'dentista',
  });

  const { data, error } = await ctx.db
    .from('dentistas')
    .insert({ ...dados, usuario_id: usuario.id, clinica_id: clinicaId })
    .select(COLUNAS)
    .single();
  if (error) {
    await desfazerCadastroUsuario(ctx.db, usuario.id);
    falhaDoBanco('cadastrar dentista', error);
  }
  return data as Dentista;
}

/** Altera dados cadastrais. O id não muda, então agendamentos vinculados continuam apontando para ele. */
export async function editar(ctx: Contexto, dentistaId: unknown, entrada: unknown): Promise<Dentista> {
  exigirPermissao(ctx.usuario, 'dentista:editar');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const id = validar(dentistaIdSchema, dentistaId);
  const dados = validar(editarDentistaSchema, entrada);

  const { data, error } = await ctx.db
    .from('dentistas')
    .update(dados)
    .eq('id', id)
    .eq('clinica_id', clinicaId)
    .select(COLUNAS)
    .maybeSingle();
  if (error) falhaDoBanco('editar dentista', error);
  if (!data) throw new ErroNegocio(DENTISTA_NAO_ENCONTRADO);
  return data as Dentista;
}

/**
 * Desativa o dentista e remove o acesso de login dele (Feature 001, Cenário 7). Nada é apagado:
 * agendamentos futuros continuam existindo e passam a exibir alerta; novos agendamentos são bloqueados (Feature 006).
 */
export async function remover(ctx: Contexto, dentistaId: unknown): Promise<Dentista> {
  exigirPermissao(ctx.usuario, 'dentista:remover');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const id = validar(dentistaIdSchema, dentistaId);

  const dentista = await buscar(ctx, clinicaId, id);
  if (!dentista) throw new ErroNegocio(DENTISTA_NAO_ENCONTRADO);

  // Primeiro o acesso: se a desativação falhar depois, repetir a remoção é seguro.
  await authService.removerUsuario(ctx, dentista.usuario_id);

  const { data, error } = await ctx.db
    .from('dentistas')
    .update({ ativo: false })
    .eq('id', id)
    .eq('clinica_id', clinicaId)
    .select(COLUNAS)
    .single();
  if (error) falhaDoBanco('remover dentista', error);
  return data as Dentista;
}

/** Dentista da clínica do usuário; `null` se não existir ou for de outra clínica. */
export async function obter(ctx: Contexto, dentistaId: unknown): Promise<Dentista | null> {
  exigirPermissao(ctx.usuario, 'dentista:ver');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const id = validar(dentistaIdSchema, dentistaId);
  return buscar(ctx, clinicaId, id);
}

/** Dentistas da clínica em ordem alfabética. `apenasAtivos` = os disponíveis para seleção no agendamento. */
export async function listar(ctx: Contexto, opcoes: unknown = {}): Promise<Dentista[]> {
  exigirPermissao(ctx.usuario, 'dentista:ver');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const { apenasAtivos } = validar(listarDentistasSchema, opcoes);

  let consulta = ctx.db.from('dentistas').select(COLUNAS).eq('clinica_id', clinicaId);
  if (apenasAtivos) consulta = consulta.eq('ativo', true);
  const { data, error } = await consulta;
  if (error) falhaDoBanco('listar dentistas', error);
  return ordenarDentistas(data as Dentista[]);
}
