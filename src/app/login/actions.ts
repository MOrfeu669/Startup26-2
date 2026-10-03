'use server';

import { redirect } from 'next/navigation';
import { env } from '@/lib/env';
import { mensagemDe } from '@/lib/sessao';
import { criarClienteAdmin } from '@/lib/supabase/admin';
import { criarClienteServidor } from '@/lib/supabase/server';
import { authService } from '@/modules/autenticacao';
import type { EstadoFormulario } from '../formulario';

export async function entrar(_estado: EstadoFormulario | null, form: FormData): Promise<EstadoFormulario> {
  const auth = await criarClienteServidor();
  const db = criarClienteAdmin();
  let destino = '/agendamentos';
  try {
    const { usuario } = await authService.login(
      { email: form.get('email'), senha: form.get('senha') },
      { auth, db },
    );
    destino = usuario.clinica_id ? '/agendamentos' : '/clinica';
  } catch (erro) {
    return { erro: mensagemDe(erro) };
  }
  redirect(destino);
}

export async function solicitarRecuperacao(
  _estado: EstadoFormulario | null,
  form: FormData,
): Promise<EstadoFormulario> {
  const auth = await criarClienteServidor();
  try {
    await authService.solicitarRecuperacaoSenha(
      { email: form.get('email') },
      { auth, redirectTo: `${env.siteUrl}/auth/callback` },
    );
  } catch (erro) {
    return { erro: mensagemDe(erro) };
  }
  return { ok: 'Se o email estiver cadastrado, enviamos um link para redefinir a senha.' };
}

export async function definirNovaSenha(
  _estado: EstadoFormulario | null,
  form: FormData,
): Promise<EstadoFormulario> {
  const auth = await criarClienteServidor();
  try {
    await authService.redefinirSenha({ novaSenha: form.get('novaSenha') }, { auth });
  } catch (erro) {
    return { erro: mensagemDe(erro) };
  }
  redirect('/login');
}

export async function sair(): Promise<void> {
  const auth = await criarClienteServidor();
  await authService.logout({ auth });
  redirect('/login');
}
