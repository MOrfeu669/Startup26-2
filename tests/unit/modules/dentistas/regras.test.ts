import { describe, expect, it } from 'vitest';
import { ErroPermissao } from '@/lib/erros';
import { exigirPermissao, podeExecutar, type Papel } from '@/modules/autenticacao';
import { normalizarEspecialidades, ordenarDentistas } from '@/modules/dentistas';

describe('normalizarEspecialidades', () => {
  it('remove vazias e repetidas (sem diferenciar maiúsculas), mantendo a primeira grafia e a ordem', () => {
    expect(normalizarEspecialidades(['Endodontia', ' ', 'ORTODONTIA', 'endodontia ', 'Ortodontia'])).toEqual([
      'Endodontia',
      'ORTODONTIA',
    ]);
    expect(normalizarEspecialidades([])).toEqual([]);
  });
});

describe('ordenarDentistas', () => {
  it('ordena por nome sem diferenciar acentos e maiúsculas', () => {
    const nomes = ordenarDentistas([{ nome: 'Dr. Érico' }, { nome: 'dra. Ana' }, { nome: 'Dr. Bruno' }]).map((d) => d.nome);
    expect(nomes).toEqual(['Dr. Bruno', 'Dr. Érico', 'dra. Ana']);
  });

  it('não altera a lista original', () => {
    const lista = [{ nome: 'B' }, { nome: 'A' }];
    ordenarDentistas(lista);
    expect(lista.map((d) => d.nome)).toEqual(['B', 'A']);
  });
});

describe('permissões de dentistas', () => {
  const papeis: Papel[] = ['admin', 'dentista', 'recepcionista'];

  it('só o Admin cadastra, edita e remove dentistas', () => {
    for (const acao of ['dentista:cadastrar', 'dentista:editar', 'dentista:remover'] as const) {
      expect(podeExecutar({ papel: 'admin', ativo: true }, acao)).toBe(true);
      expect(() => exigirPermissao({ papel: 'dentista', ativo: true }, acao)).toThrow(ErroPermissao);
      expect(() => exigirPermissao({ papel: 'recepcionista', ativo: true }, acao)).toThrow(ErroPermissao);
    }
  });

  it('qualquer papel vê os dentistas (seleção no agendamento)', () => {
    for (const papel of papeis) expect(podeExecutar({ papel, ativo: true }, 'dentista:ver')).toBe(true);
  });
});
