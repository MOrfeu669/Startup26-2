import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Contexto, Papel, Usuario } from '@/modules/autenticacao';

export const SENHA_PADRAO = 'senha-de-teste-123';

export interface UsuarioDeTeste {
  usuario: Usuario;
  senha: string;
}

/** Cria usuário no Auth local + linha em `usuarios`, sem passar pelas regras de permissão. */
export async function criarUsuarioDeTeste(
  db: SupabaseClient,
  dados: { papel: Papel; clinica_id: string | null; nome?: string; email?: string; senha?: string },
): Promise<UsuarioDeTeste> {
  const senha = dados.senha ?? SENHA_PADRAO;
  const email = dados.email ?? `${dados.papel}-${randomUUID().slice(0, 8)}@teste.local`;

  const { data, error } = await db.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (error || !data.user) throw new Error(`fixture: falha ao criar usuário no Auth: ${error?.message}`);

  const { data: usuario, error: erroInsert } = await db
    .from('usuarios')
    .insert({
      id: data.user.id,
      nome: dados.nome ?? `Usuário ${dados.papel}`,
      email,
      papel: dados.papel,
      clinica_id: dados.clinica_id,
    })
    .select('id, nome, email, papel, clinica_id, ativo')
    .single();
  if (erroInsert) throw new Error(`fixture: falha ao inserir usuário: ${erroInsert.message}`);

  return { usuario: usuario as Usuario, senha };
}

export function contextoDe(db: SupabaseClient, usuario: Usuario): Contexto {
  return { db, usuario };
}
