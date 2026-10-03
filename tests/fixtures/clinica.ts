import type { SupabaseClient } from '@supabase/supabase-js';
import { carregarUsuario, type Contexto, type Usuario } from '@/modules/autenticacao';
import { clinicaService, type Cadeira, type Clinica, type CriarClinicaInput } from '@/modules/clinica';
import { contextoDe, criarUsuarioDeTeste } from './usuarios';

export const DADOS_CLINICA_PADRAO = {
  nome: 'Clínica de Teste',
  dias_atendimento: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
  cadeiras: 3,
} satisfies CriarClinicaInput;

export interface ClinicaDeTeste {
  clinicaId: string;
  clinica: Clinica;
  cadeiras: Cadeira[];
  /** Admin já recarregado do banco, com `clinica_id` preenchido. */
  admin: Usuario;
  ctxAdmin: Contexto;
}

/** Cria um Admin e a clínica dele pelo `clinicaService` (horário padrão, seg–sex, 3 cadeiras). */
export async function criarClinicaComAdmin(
  db: SupabaseClient,
  dados: Partial<CriarClinicaInput> = {},
): Promise<ClinicaDeTeste> {
  const { usuario: adminSemClinica } = await criarUsuarioDeTeste(db, { papel: 'admin', clinica_id: null });
  const clinica = await clinicaService.criar(contextoDe(db, adminSemClinica), { ...DADOS_CLINICA_PADRAO, ...dados });

  const admin = await carregarUsuario(db, adminSemClinica.id);
  if (!admin?.clinica_id) throw new Error('fixture: Admin não foi vinculado à clínica criada');

  return { clinicaId: clinica.id, clinica, cadeiras: clinica.cadeiras, admin, ctxAdmin: contextoDe(db, admin) };
}
