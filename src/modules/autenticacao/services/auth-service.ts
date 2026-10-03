import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { ErroNegocio, ErroPermissao, falhaDoBanco } from '@/lib/erros';
import { validar } from '@/lib/validacao';
import {
  cadastrarUsuarioSchema,
  loginSchema,
  redefinirSenhaSchema,
  registrarAdminSchema,
  solicitarRecuperacaoSchema,
  type Contexto,
  type Papel,
  type Usuario,
} from '../types';
import { clinicaDoUsuario, exigirMesmaClinica, exigirPermissao } from './autorizacao';

const COLUNAS = 'id, nome, email, papel, clinica_id, ativo';
const CREDENCIAIS_INVALIDAS = 'Credenciais inválidas';
// Supabase Auth não tem "desativar"; o banimento longo impede novos logins e renovação de sessão.
const BANIMENTO_PERMANENTE = '876000h';

export interface DepsAuth {
  /** Cliente com a chave pública (ou o cliente SSR com cookies) — onde a sessão é criada. */
  auth: SupabaseClient;
  /** Cliente de dados do servidor (service role). */
  db: SupabaseClient;
}

export interface ResultadoLogin {
  sessao: Session;
  usuario: Usuario;
}

export async function carregarUsuario(db: SupabaseClient, id: string): Promise<Usuario | null> {
  const { data, error } = await db.from('usuarios').select(COLUNAS).eq('id', id).maybeSingle();
  if (error) falhaDoBanco('carregar usuário', error);
  return data as Usuario | null;
}

export async function login(entrada: unknown, deps: DepsAuth): Promise<ResultadoLogin> {
  const { email, senha } = validar(loginSchema, entrada);

  const { data, error } = await deps.auth.auth.signInWithPassword({ email, password: senha });
  if (error && /fetch|network|ECONNREFUSED/i.test(`${error.message} ${error.name}`)) {
    falhaDoBanco('entrar', error);
  }
  if (error || !data.session) throw new ErroNegocio(CREDENCIAIS_INVALIDAS);

  const usuario = await carregarUsuario(deps.db, data.user.id);
  if (!usuario || !usuario.ativo) {
    await deps.auth.auth.signOut();
    throw new ErroNegocio(CREDENCIAIS_INVALIDAS);
  }
  return { sessao: data.session, usuario };
}

export async function logout(deps: Pick<DepsAuth, 'auth'>): Promise<void> {
  await deps.auth.auth.signOut();
}

async function criarUsuarioNoAuth(
  db: SupabaseClient,
  dados: { nome: string; email: string; senha: string; papel: Papel; clinica_id: string | null },
): Promise<Usuario> {
  const { data, error } = await db.auth.admin.createUser({
    email: dados.email,
    password: dados.senha,
    email_confirm: true,
  });
  if (error || !data.user) {
    if (error?.code === 'email_exists') throw new ErroNegocio('Já existe um usuário com este email');
    falhaDoBanco('criar usuário no Auth', error);
  }

  const { data: linha, error: erroInsert } = await db
    .from('usuarios')
    .insert({
      id: data.user.id,
      nome: dados.nome,
      email: dados.email,
      papel: dados.papel,
      clinica_id: dados.clinica_id,
    })
    .select(COLUNAS)
    .single();
  if (erroInsert) {
    await db.auth.admin.deleteUser(data.user.id);
    falhaDoBanco('registrar usuário', erroInsert);
  }
  return linha as Usuario;
}

/** Admin cadastra Dentista ou Recepcionista na própria clínica (Cenário 3). */
export async function cadastrarUsuario(ctx: Contexto, entrada: unknown): Promise<Usuario> {
  exigirPermissao(ctx.usuario, 'usuario:cadastrar');
  const dados = validar(cadastrarUsuarioSchema, entrada);
  return criarUsuarioNoAuth(ctx.db, { ...dados, clinica_id: clinicaDoUsuario(ctx.usuario) });
}

/**
 * Cria o Admin dono de uma clínica ainda não configurada.
 * ⚠️ PENDENTE (001): a spec não define como o primeiro Admin é criado; por ora só via script/fixture.
 */
export async function registrarAdmin(db: SupabaseClient, entrada: unknown): Promise<Usuario> {
  const dados = validar(registrarAdminSchema, entrada);
  return criarUsuarioNoAuth(db, { ...dados, papel: 'admin', clinica_id: null });
}

/**
 * Compensação: apaga um usuário recém-criado (linha em `usuarios` + Auth) quando o passo seguinte do
 * cadastro falhou (ex.: registro do dentista, Feature 003). Não serve para remover usuários: use `removerUsuario`.
 */
export async function desfazerCadastroUsuario(db: SupabaseClient, usuarioId: string): Promise<void> {
  const { error } = await db.from('usuarios').delete().eq('id', usuarioId);
  if (error) falhaDoBanco('desfazer cadastro do usuário', error);
  const { error: erroAuth } = await db.auth.admin.deleteUser(usuarioId);
  if (erroAuth) falhaDoBanco('desfazer cadastro do usuário no Auth', erroAuth);
}

/** Remove só o acesso: dados clínicos continuam vinculados à clínica (Cenário 7). */
export async function removerUsuario(ctx: Contexto, usuarioId: string): Promise<Usuario> {
  exigirPermissao(ctx.usuario, 'usuario:remover');

  const alvo = await carregarUsuario(ctx.db, usuarioId);
  if (!alvo) throw new ErroNegocio('Usuário não encontrado');
  exigirMesmaClinica(ctx.usuario, alvo.clinica_id ?? '');
  if (alvo.papel === 'admin') throw new ErroPermissao('O Admin da clínica não pode ser removido');

  const { error: erroAuth } = await ctx.db.auth.admin.updateUserById(alvo.id, {
    ban_duration: BANIMENTO_PERMANENTE,
  });
  if (erroAuth) falhaDoBanco('bloquear acesso no Auth', erroAuth);

  const { data, error } = await ctx.db
    .from('usuarios')
    .update({ ativo: false })
    .eq('id', alvo.id)
    .eq('clinica_id', clinicaDoUsuario(ctx.usuario))
    .select(COLUNAS)
    .single();
  if (error) falhaDoBanco('remover acesso do usuário', error);
  return data as Usuario;
}

/** Envia o email de redefinição pelo Supabase Auth (Cenário 6). Não revela se o email existe. */
export async function solicitarRecuperacaoSenha(
  entrada: unknown,
  deps: Pick<DepsAuth, 'auth'> & { redirectTo: string },
): Promise<void> {
  const { email } = validar(solicitarRecuperacaoSchema, entrada);
  const { error } = await deps.auth.auth.resetPasswordForEmail(email, { redirectTo: deps.redirectTo });
  if (error) falhaDoBanco('solicitar recuperação de senha', error);
}

/** Define a nova senha. Requer a sessão de recuperação aberta pelo link do email. */
export async function redefinirSenha(entrada: unknown, deps: Pick<DepsAuth, 'auth'>): Promise<void> {
  const { novaSenha } = validar(redefinirSenhaSchema, entrada);
  const { error } = await deps.auth.auth.updateUser({ password: novaSenha });
  if (error) throw new ErroNegocio('Não foi possível redefinir a senha. Solicite um novo link.');
}
