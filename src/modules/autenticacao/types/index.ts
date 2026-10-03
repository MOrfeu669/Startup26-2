import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const PAPEIS = ['admin', 'dentista', 'recepcionista'] as const;
export const papelSchema = z.enum(PAPEIS);
export type Papel = z.infer<typeof papelSchema>;

export interface Usuario {
  id: string; // mesmo id do usuário no Supabase Auth
  nome: string;
  email: string;
  papel: Papel;
  clinica_id: string | null; // nulo só para o Admin antes de criar a clínica (Feature 002)
  ativo: boolean;
}

/** Contexto de execução dos services: cliente de dados do servidor + usuário autenticado. */
export interface Contexto {
  db: SupabaseClient;
  usuario: Usuario;
}

export const loginSchema = z.object({
  email: z.email('Email inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const cadastrarUsuarioSchema = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório'),
  email: z.email('Email inválido'),
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  papel: z.enum(['dentista', 'recepcionista'], 'Papel deve ser dentista ou recepcionista'),
});
export type CadastrarUsuarioInput = z.infer<typeof cadastrarUsuarioSchema>;

export const registrarAdminSchema = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório'),
  email: z.email('Email inválido'),
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});
export type RegistrarAdminInput = z.infer<typeof registrarAdminSchema>;

export const solicitarRecuperacaoSchema = z.object({
  email: z.email('Email inválido'),
});

export const redefinirSenhaSchema = z.object({
  novaSenha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});
