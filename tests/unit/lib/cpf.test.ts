import { describe, expect, it } from 'vitest';
import { cpfSchema, formatarCpf, normalizarCpf } from '@/lib/cpf';
import { ErroValidacao } from '@/lib/erros';
import { validar } from '@/lib/validacao';

describe('normalizarCpf', () => {
  it('remove pontos, hífen e espaços', () => {
    expect(normalizarCpf('123.456.789-09')).toBe('12345678909');
    expect(normalizarCpf(' 123 456 789 09 ')).toBe('12345678909');
    expect(normalizarCpf('12345678909')).toBe('12345678909');
  });
});

describe('formatarCpf', () => {
  it('aplica a máscara 000.000.000-00', () => {
    expect(formatarCpf('12345678909')).toBe('123.456.789-09');
    expect(formatarCpf('123.456.789-09')).toBe('123.456.789-09');
  });

  it('devolve como veio o que não tem 11 dígitos', () => {
    expect(formatarCpf('123')).toBe('123');
  });
});

describe('cpfSchema', () => {
  it('aceita com ou sem máscara e devolve só os dígitos', () => {
    expect(validar(cpfSchema, '000.000.000-00')).toBe('00000000000');
    expect(validar(cpfSchema, '12345678909')).toBe('12345678909');
  });

  it('exige o CPF preenchido', () => {
    expect(() => validar(cpfSchema, '')).toThrow('CPF obrigatório');
    expect(() => validar(cpfSchema, '   ')).toThrow('CPF obrigatório');
    expect(() => validar(cpfSchema, undefined)).toThrow('CPF obrigatório');
  });

  it('exige exatamente 11 dígitos', () => {
    expect(() => validar(cpfSchema, '123.456.789-0')).toThrow('CPF deve ter 11 dígitos');
    expect(() => validar(cpfSchema, '123456789012')).toThrow('CPF deve ter 11 dígitos');
    expect(() => validar(cpfSchema, '123.abc.789-09')).toThrow(ErroValidacao);
  });

  it('não confere o dígito verificador (nenhuma spec define)', () => {
    expect(validar(cpfSchema, '111.111.111-11')).toBe('11111111111');
  });
});
