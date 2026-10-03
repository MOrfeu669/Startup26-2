import { describe, expect, it } from 'vitest';
import { validar } from '@/lib/validacao';
import { criarProcedimentoSchema, editarProcedimentoSchema } from '@/modules/procedimentos';

describe('criarProcedimentoSchema', () => {
  it('aceita o exemplo da spec sem materiais', () => {
    expect(
      validar(criarProcedimentoSchema, { nome: 'Restauração', tempo_medio_minutos: 40, valor_medio: 150 }),
    ).toEqual({ nome: 'Restauração', tempo_medio_minutos: 40, valor_medio: 150 });
  });

  it('rejeita tempo não positivo e valor negativo', () => {
    expect(() => validar(criarProcedimentoSchema, { nome: 'X', tempo_medio_minutos: 0, valor_medio: 1 })).toThrow(
      'Tempo médio deve ser maior que zero',
    );
    expect(() => validar(criarProcedimentoSchema, { nome: 'X', tempo_medio_minutos: 10, valor_medio: -1 })).toThrow(
      'Valor médio não pode ser negativo',
    );
    expect(() => validar(criarProcedimentoSchema, { nome: '  ', tempo_medio_minutos: 10, valor_medio: 0 })).toThrow(
      'Nome obrigatório',
    );
  });
});

describe('editarProcedimentoSchema', () => {
  it('aceita alteração parcial e exige algum campo', () => {
    expect(validar(editarProcedimentoSchema, { tempo_medio_minutos: 45 })).toEqual({ tempo_medio_minutos: 45 });
    expect(() => validar(editarProcedimentoSchema, {})).toThrow('Informe ao menos um campo para alterar');
  });
});
