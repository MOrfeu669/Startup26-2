import { describe, expect, it } from 'vitest';
import { ErroPermissao } from '@/lib/erros';
import { PERMISSOES, clinicaDoUsuario, podeExecutar, type Acao } from '@/modules/autenticacao';

const acoes = Object.keys(PERMISSOES) as Acao[];

describe('matriz de permissões (pirâmide pura)', () => {
  it('Admin pode executar todas as ações', () => {
    for (const acao of acoes) expect(podeExecutar({ papel: 'admin', ativo: true }, acao)).toBe(true);
  });

  it('Admin herda as ações exclusivas do Dentista', () => {
    expect(podeExecutar({ papel: 'admin', ativo: true }, 'odontograma:preencher')).toBe(true);
    expect(podeExecutar({ papel: 'dentista', ativo: true }, 'odontograma:preencher')).toBe(true);
  });

  it('Dentista não executa ações exclusivas do Admin', () => {
    expect(podeExecutar({ papel: 'dentista', ativo: true }, 'usuario:cadastrar')).toBe(false);
    expect(podeExecutar({ papel: 'dentista', ativo: true }, 'clinica:configurar')).toBe(false);
  });

  it('usuário inativo não executa nenhuma ação', () => {
    for (const acao of acoes) expect(podeExecutar({ papel: 'admin', ativo: false }, acao)).toBe(false);
  });

  it('clinicaDoUsuario falha para Admin sem clínica configurada', () => {
    expect(() => clinicaDoUsuario({ clinica_id: null })).toThrow(ErroPermissao);
    expect(clinicaDoUsuario({ clinica_id: 'c1' })).toBe('c1');
  });
});
