import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ErroValidacao } from '@/lib/erros';
import { validar } from '@/lib/validacao';

describe('validar', () => {
  const schema = z.object({ nome: z.string().min(1, 'Nome obrigatório') });

  it('devolve os dados quando a entrada é válida', () => {
    expect(validar(schema, { nome: 'Ana' })).toEqual({ nome: 'Ana' });
  });

  it('lança ErroValidacao com a mensagem e os campos inválidos', () => {
    try {
      validar(schema, { nome: '' });
      expect.unreachable();
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroValidacao);
      expect((erro as ErroValidacao).message).toBe('Nome obrigatório');
      expect((erro as ErroValidacao).campos).toEqual({ nome: ['Nome obrigatório'] });
    }
  });
});
