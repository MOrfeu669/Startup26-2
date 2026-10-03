import type { Contexto } from '@/modules/autenticacao';
import { procedimentoService, type CriarProcedimentoInput, type Procedimento } from '@/modules/procedimentos';

export async function criarProcedimentoDeTeste(
  ctx: Contexto,
  overrides: Partial<CriarProcedimentoInput> = {},
): Promise<Procedimento> {
  return procedimentoService.criar(ctx, {
    nome: 'Limpeza',
    tempo_medio_minutos: 30,
    valor_medio: 120,
    ...overrides,
  });
}
