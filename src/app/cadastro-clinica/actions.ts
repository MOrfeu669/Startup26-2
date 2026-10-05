'use server';

import { redirect } from 'next/navigation';
import { mensagemDe } from '@/lib/sessao';
import { criarClienteAdmin } from '@/lib/supabase/admin';
import { criarClienteServidor } from '@/lib/supabase/server';
import { authService } from '@/modules/autenticacao';
import type { EstadoFormulario } from '../formulario';

/** Cria o Admin (bootstrap da Feature 001) e abre a tela de criar clínica (Feature 002). */
export async function cadastrarAdminClinica(
  _estado: EstadoFormulario | null,
  form: FormData,
): Promise<EstadoFormulario> {
  const nome = form.get('nome');
  const email = form.get('email');
  const senha = form.get('senha');
  const db = criarClienteAdmin();
  const auth = await criarClienteServidor();
  try {
    await authService.registrarAdmin(db, { nome, email, senha });
    await authService.login({ email, senha }, { auth, db });
  } catch (erro) {
    return { erro: mensagemDe(erro) };
  }
  redirect('/clinica');
}
