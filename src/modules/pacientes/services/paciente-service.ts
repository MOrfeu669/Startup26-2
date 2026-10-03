import { ErroNegocio, falhaDoBanco } from '@/lib/erros';
import { validar } from '@/lib/validacao';
import { clinicaDoUsuario, exigirPermissao, type Contexto } from '@/modules/autenticacao';
import {
  criarCadastrarPacienteSchema,
  editarPacienteSchema,
  listarPacientesSchema,
  pacienteIdSchema,
  type CanalComunicacao,
  type Paciente,
  type PacienteValidado,
  type ResponsavelLegal,
  type Sexo,
  type TipoCanal,
} from '../types';
import { calcularIdade, ordenarCanais, ordenarPacientes } from './regras';

const COLUNAS =
  'id, clinica_id, nome, cpf, endereco, data_nascimento, sexo, responsavel_nome, responsavel_cpf, responsavel_telefone';
const PACIENTE_NAO_ENCONTRADO = 'Paciente não encontrado';

interface LinhaPaciente {
  id: string;
  clinica_id: string;
  nome: string;
  cpf: string | null;
  endereco: string | null;
  data_nascimento: string | null;
  sexo: Sexo | null;
  responsavel_nome: string | null;
  responsavel_cpf: string | null;
  responsavel_telefone: string | null;
}

interface LinhaCanal {
  paciente_id: string;
  canal: TipoCanal;
  contato: string;
  preferido: boolean;
}

/** Cadastro bloqueado porque já existe paciente com o mesmo CPF nesta clínica. Carrega o registro existente. */
export class ErroCpfDuplicado extends ErroNegocio {
  readonly pacienteExistente: Pick<Paciente, 'id' | 'nome' | 'cpf'>;

  constructor(paciente: Pick<Paciente, 'id' | 'nome' | 'cpf'>) {
    super(`Já existe um paciente com este CPF: ${paciente.nome}`);
    this.name = 'ErroCpfDuplicado';
    this.pacienteExistente = paciente;
  }
}

function responsavelDe(linha: LinhaPaciente): ResponsavelLegal | undefined {
  if (!linha.responsavel_nome || !linha.responsavel_cpf) return undefined;
  return {
    nome: linha.responsavel_nome,
    cpf: linha.responsavel_cpf,
    ...(linha.responsavel_telefone ? { telefone: linha.responsavel_telefone } : {}),
  };
}

function paraPaciente(linha: LinhaPaciente, canais: CanalComunicacao[], referencia: Date): Paciente {
  const data = linha.data_nascimento ?? undefined;
  return {
    id: linha.id,
    clinica_id: linha.clinica_id,
    nome: linha.nome,
    canais_comunicacao: ordenarCanais(canais),
    ...(linha.cpf ? { cpf: linha.cpf } : {}),
    ...(linha.endereco ? { endereco: linha.endereco } : {}),
    ...(data ? { data_nascimento: data } : {}),
    idade: data ? calcularIdade(data, referencia) : null,
    ...(linha.sexo ? { sexo: linha.sexo } : {}),
    ...(responsavelDe(linha) ? { responsavel_legal: responsavelDe(linha) } : {}),
  };
}

async function canaisPorPaciente(ctx: Contexto, clinicaId: string, ids: string[]): Promise<Map<string, CanalComunicacao[]>> {
  const mapa = new Map<string, CanalComunicacao[]>();
  if (ids.length === 0) return mapa;
  const { data, error } = await ctx.db
    .from('canais_comunicacao')
    .select('paciente_id, canal, contato, preferido')
    .eq('clinica_id', clinicaId)
    .in('paciente_id', ids);
  if (error) falhaDoBanco('listar canais de comunicação', error);
  for (const linha of data as LinhaCanal[]) {
    const lista = mapa.get(linha.paciente_id) ?? [];
    lista.push({ canal: linha.canal, contato: linha.contato, preferido: linha.preferido });
    mapa.set(linha.paciente_id, lista);
  }
  return mapa;
}

async function montar(ctx: Contexto, clinicaId: string, linhas: LinhaPaciente[], referencia: Date): Promise<Paciente[]> {
  const canais = await canaisPorPaciente(
    ctx,
    clinicaId,
    linhas.map((linha) => linha.id),
  );
  return ordenarPacientes(linhas.map((linha) => paraPaciente(linha, canais.get(linha.id) ?? [], referencia)));
}

async function buscarLinha(ctx: Contexto, clinicaId: string, id: string): Promise<LinhaPaciente | null> {
  const { data, error } = await ctx.db
    .from('pacientes')
    .select(COLUNAS)
    .eq('id', id)
    .eq('clinica_id', clinicaId)
    .maybeSingle();
  if (error) falhaDoBanco('carregar paciente', error);
  return data as LinhaPaciente | null;
}

async function pacienteExistentePorCpf(ctx: Contexto, clinicaId: string, cpf: string) {
  const { data, error } = await ctx.db
    .from('pacientes')
    .select('id, nome, cpf')
    .eq('clinica_id', clinicaId)
    .eq('cpf', cpf)
    .maybeSingle();
  if (error) falhaDoBanco('buscar paciente por CPF', error);
  return data as { id: string; nome: string; cpf: string } | null;
}

function parametros(clinicaId: string, id: string | null, dados: PacienteValidado) {
  const responsavel = dados.responsavel_legal;
  return {
    p_id: id,
    p_clinica_id: clinicaId,
    p_nome: dados.nome,
    p_cpf: dados.cpf ?? null,
    p_endereco: dados.endereco ?? null,
    p_data_nascimento: dados.data_nascimento ?? null,
    p_sexo: dados.sexo ?? null,
    p_responsavel_nome: responsavel?.nome ?? null,
    p_responsavel_cpf: responsavel?.cpf ?? null,
    p_responsavel_telefone: responsavel?.telefone ?? null,
    p_canais: dados.canais_comunicacao,
  };
}

async function salvar(
  ctx: Contexto,
  clinicaId: string,
  id: string | null,
  dados: PacienteValidado,
  referencia: Date,
): Promise<Paciente> {
  const { data, error } = await ctx.db.rpc('salvar_paciente', parametros(clinicaId, id, dados));
  if (error) {
    if (error.message === 'CPF_DUPLICADO' && dados.cpf) {
      const existente = await pacienteExistentePorCpf(ctx, clinicaId, dados.cpf);
      if (existente) throw new ErroCpfDuplicado(existente);
    }
    if (error.message === 'CANAL_OBRIGATORIO') throw new ErroNegocio('Informe pelo menos um canal de comunicação');
    if (error.message === 'CANAL_PREFERIDO') throw new ErroNegocio('Informe exatamente um canal preferido');
    if (error.message === 'PACIENTE_NAO_ENCONTRADO') throw new ErroNegocio(PACIENTE_NAO_ENCONTRADO);
    falhaDoBanco('salvar paciente', error);
  }

  const linha = await buscarLinha(ctx, clinicaId, data as string);
  if (!linha) throw new ErroNegocio(PACIENTE_NAO_ENCONTRADO);
  const [paciente] = await montar(ctx, clinicaId, [linha], referencia);
  return paciente!;
}

/** Qualquer papel cadastra o paciente na própria clínica. O paciente não recebe login. */
export async function cadastrar(ctx: Contexto, entrada: unknown, referencia: Date = new Date()): Promise<Paciente> {
  exigirPermissao(ctx.usuario, 'paciente:cadastrar');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const dados = validar(criarCadastrarPacienteSchema(referencia), entrada);
  if (dados.cpf) {
    const existente = await pacienteExistentePorCpf(ctx, clinicaId, dados.cpf);
    if (existente) throw new ErroCpfDuplicado(existente);
  }
  return salvar(ctx, clinicaId, null, dados, referencia);
}

/** Atualiza a Visão Geral. O id não muda, então agendamentos e prontuário continuam apontando para ele. */
export async function editar(
  ctx: Contexto,
  pacienteId: unknown,
  entrada: unknown,
  referencia: Date = new Date(),
): Promise<Paciente> {
  exigirPermissao(ctx.usuario, 'paciente:editar');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const id = validar(pacienteIdSchema, pacienteId);
  const patch = validar(editarPacienteSchema, entrada);

  const atual = await buscarLinha(ctx, clinicaId, id);
  if (!atual) throw new ErroNegocio(PACIENTE_NAO_ENCONTRADO);
  const [completo] = await montar(ctx, clinicaId, [atual], referencia);
  const base = completo!;

  const dados = validar(criarCadastrarPacienteSchema(referencia), {
    nome: patch.nome ?? base.nome,
    canais_comunicacao: patch.canais_comunicacao ?? base.canais_comunicacao,
    cpf: patch.cpf === undefined ? base.cpf : (patch.cpf ?? undefined),
    endereco: patch.endereco === undefined ? base.endereco : (patch.endereco ?? undefined),
    data_nascimento: patch.data_nascimento === undefined ? base.data_nascimento : (patch.data_nascimento ?? undefined),
    sexo: patch.sexo === undefined ? base.sexo : (patch.sexo ?? undefined),
    responsavel_legal:
      patch.responsavel_legal === undefined ? base.responsavel_legal : (patch.responsavel_legal ?? undefined),
  });

  if (dados.cpf && dados.cpf !== base.cpf) {
    const existente = await pacienteExistentePorCpf(ctx, clinicaId, dados.cpf);
    if (existente) throw new ErroCpfDuplicado(existente);
  }
  return salvar(ctx, clinicaId, id, dados, referencia);
}

/** Paciente da clínica do usuário; `null` se não existir ou for de outra clínica. */
export async function obter(ctx: Contexto, pacienteId: unknown, referencia: Date = new Date()): Promise<Paciente | null> {
  exigirPermissao(ctx.usuario, 'paciente:ver');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const id = validar(pacienteIdSchema, pacienteId);
  const linha = await buscarLinha(ctx, clinicaId, id);
  if (!linha) return null;
  const [paciente] = await montar(ctx, clinicaId, [linha], referencia);
  return paciente!;
}

/** Pacientes da clínica, em ordem alfabética. `busca` filtra o nome (seleção do agendamento). */
export async function listar(ctx: Contexto, opcoes: unknown = {}, referencia: Date = new Date()): Promise<Paciente[]> {
  exigirPermissao(ctx.usuario, 'paciente:ver');
  const clinicaId = clinicaDoUsuario(ctx.usuario);
  const { busca } = validar(listarPacientesSchema, opcoes);

  let consulta = ctx.db.from('pacientes').select(COLUNAS).eq('clinica_id', clinicaId);
  if (busca) consulta = consulta.ilike('nome', `%${busca}%`);
  const { data, error } = await consulta;
  if (error) falhaDoBanco('listar pacientes', error);
  return montar(ctx, clinicaId, (data ?? []) as LinhaPaciente[], referencia);
}
