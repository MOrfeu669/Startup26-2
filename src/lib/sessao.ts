import { redirect } from 'next/navigation';
import { criarClienteAdmin } from '@/lib/supabase/admin';
import { criarClienteServidor } from '@/lib/supabase/server';
import { carregarUsuario, type Contexto } from '@/modules/autenticacao';

/** Contexto do service a partir da sessão em cookie. `null` se não houver login ativo. */
export async function obterContexto(): Promise<Contexto | null> {
  const auth = await criarClienteServidor();
  const { data } = await auth.auth.getUser();
  if (!data.user) return null;

  const db = criarClienteAdmin();
  const usuario = await carregarUsuario(db, data.user.id);
  if (!usuario?.ativo) return null;
  return { db, usuario };
}

export async function exigirContexto(): Promise<Contexto> {
  const ctx = await obterContexto();
  if (!ctx) redirect('/login');
  return ctx;
}

/** Manda o Admin configurar a clínica antes de usar o resto do sistema. */
export function exigirClinica(ctx: Contexto): void {
  if (!ctx.usuario.clinica_id) redirect('/clinica');
}

export function mensagemDe(erro: unknown): string {
  return erro instanceof Error ? erro.message : 'Não foi possível concluir a operação';
}
