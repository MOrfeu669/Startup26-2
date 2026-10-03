import { ErroPermissao } from '@/lib/erros';
import type { Papel, Usuario } from '../types';

/** Pirâmide pura: cada papel herda tudo dos papéis abaixo dele. */
const NIVEL: Record<Papel, number> = {
  recepcionista: 1,
  dentista: 2,
  admin: 3,
};

/**
 * Matriz de permissões: cada ação exige um papel mínimo.
 * "Exclusivo do Dentista" nas specs = papel mínimo `dentista` (o Admin herda).
 */
export const PERMISSOES = {
  // 001 — Autenticação
  'usuario:cadastrar': 'admin',
  'usuario:remover': 'admin',
  // 002 — Clínica
  'clinica:configurar': 'admin',
  'clinica:ver': 'recepcionista',
  // 003 — Dentistas (qualquer papel seleciona o dentista ao agendar)
  'dentista:cadastrar': 'admin',
  'dentista:editar': 'admin',
  'dentista:remover': 'admin',
  'dentista:ver': 'recepcionista',
  // 004 — Pacientes (todos os papéis cadastram e editam a Visão Geral)
  'paciente:cadastrar': 'recepcionista',
  'paciente:editar': 'recepcionista',
  'paciente:ver': 'recepcionista',
  // 005 — Procedimentos (criar/editar: Dentista ou Admin; excluir: só Admin; ver: todos)
  'procedimento:criar': 'dentista',
  'procedimento:editar': 'dentista',
  'procedimento:excluir': 'admin',
  'procedimento:ver': 'recepcionista',
  // 006 — Agendamento (todos agendam; iniciar: Dentista responsável ou Admin; bloqueio: Dentista ou Admin)
  'agendamento:criar': 'recepcionista',
  'agendamento:ver': 'recepcionista',
  'agendamento:iniciar': 'dentista',
  'bloqueio:criar': 'dentista',
  'bloqueio:ver': 'recepcionista',
  // Ações clínicas usadas por features futuras; já existem na matriz (Cenário 4 da 001).
  'odontograma:preencher': 'dentista',
  'anamnese:editar': 'dentista',
  'imagem:adicionar': 'dentista',
} as const satisfies Record<string, Papel>;

export type Acao = keyof typeof PERMISSOES;

export function podeExecutar(usuario: Pick<Usuario, 'papel' | 'ativo'>, acao: Acao): boolean {
  return usuario.ativo && NIVEL[usuario.papel] >= NIVEL[PERMISSOES[acao]];
}

export function exigirPermissao(usuario: Pick<Usuario, 'papel' | 'ativo'>, acao: Acao): void {
  if (!podeExecutar(usuario, acao)) throw new ErroPermissao();
}

/** Isolamento multi-tenant: o usuário só acessa registros da própria clínica. */
export function exigirMesmaClinica(usuario: Pick<Usuario, 'clinica_id'>, clinicaIdDoRecurso: string): void {
  if (!usuario.clinica_id || usuario.clinica_id !== clinicaIdDoRecurso) {
    throw new ErroPermissao('Acesso negado: registro de outra clínica');
  }
}

/** Devolve a clínica do usuário ou falha se o Admin ainda não criou a clínica. */
export function clinicaDoUsuario(usuario: Pick<Usuario, 'clinica_id'>): string {
  if (!usuario.clinica_id) throw new ErroPermissao('Clínica ainda não configurada');
  return usuario.clinica_id;
}
