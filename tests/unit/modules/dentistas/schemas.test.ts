import { describe, expect, it } from 'vitest';
import { ErroValidacao } from '@/lib/erros';
import { validar } from '@/lib/validacao';
import { cadastrarDentistaSchema, editarDentistaSchema, listarDentistasSchema } from '@/modules/dentistas';

const base = {
  nome: 'Dra. Ana Souza',
  cro: 'CRO-RS 12345',
  telefone: '(54) 99999-0000',
  cpf: '000.000.000-00',
  email_login: 'dra.ana@clinica.com',
  senha: 'senha-da-ana',
};

describe('cadastrarDentistaSchema', () => {
  it('aceita o exemplo da spec, guarda o CPF só com dígitos e especialidades vazias por padrão', () => {
    expect(validar(cadastrarDentistaSchema, base)).toEqual({ ...base, cpf: '00000000000', especialidades: [] });
  });

  it('exige nome, CRO, telefone e CPF', () => {
    for (const [campo, mensagem] of [
      ['nome', 'Nome obrigatório'],
      ['cro', 'CRO obrigatório'],
      ['telefone', 'Telefone obrigatório'],
      ['cpf', 'CPF obrigatório'],
    ] as const) {
      expect(() => validar(cadastrarDentistaSchema, { ...base, [campo]: '  ' }), campo).toThrow(mensagem);
      const { [campo]: _omitido, ...semCampo } = base;
      expect(() => validar(cadastrarDentistaSchema, semCampo), campo).toThrow(ErroValidacao);
    }
  });

  it('exige email de login e senha válidos (mesmas regras da Feature 001)', () => {
    expect(() => validar(cadastrarDentistaSchema, { ...base, email_login: 'ana' })).toThrow('Email inválido');
    expect(() => validar(cadastrarDentistaSchema, { ...base, senha: '123' })).toThrow(
      'A senha deve ter pelo menos 6 caracteres',
    );
  });

  it('normaliza as especialidades informadas', () => {
    const dados = validar(cadastrarDentistaSchema, {
      ...base,
      especialidades: [' Endodontia ', 'endodontia', 'Ortodontia'],
    });
    expect(dados.especialidades).toEqual(['Endodontia', 'Ortodontia']);
    expect(() => validar(cadastrarDentistaSchema, { ...base, especialidades: [''] })).toThrow('Especialidade vazia');
  });

  it('ignora clínica, papel e ativo vindos da entrada', () => {
    const dados = validar(cadastrarDentistaSchema, { ...base, clinica_id: 'outra', papel: 'admin', ativo: false });
    expect(dados).not.toHaveProperty('clinica_id');
    expect(dados).not.toHaveProperty('papel');
    expect(dados).not.toHaveProperty('ativo');
  });
});

describe('editarDentistaSchema', () => {
  it('aceita alteração parcial, sem preencher campos não informados', () => {
    expect(validar(editarDentistaSchema, { telefone: '(54) 98888-1111' })).toEqual({ telefone: '(54) 98888-1111' });
    expect(validar(editarDentistaSchema, { cpf: '123.456.789-09' })).toEqual({ cpf: '12345678909' });
    expect(validar(editarDentistaSchema, { especialidades: [] })).toEqual({ especialidades: [] });
  });

  it('exige ao menos um campo editável', () => {
    expect(() => validar(editarDentistaSchema, {})).toThrow('Informe ao menos um campo para alterar');
    expect(() => validar(editarDentistaSchema, { ativo: false, usuario_id: 'x' })).toThrow(
      'Informe ao menos um campo para alterar',
    );
  });

  it('não aceita apagar campos obrigatórios', () => {
    expect(() => validar(editarDentistaSchema, { nome: '' })).toThrow('Nome obrigatório');
    expect(() => validar(editarDentistaSchema, { cpf: '123' })).toThrow('CPF deve ter 11 dígitos');
  });
});

describe('listarDentistasSchema', () => {
  it('apenasAtivos é opcional e booleano', () => {
    expect(validar(listarDentistasSchema, {})).toEqual({});
    expect(() => validar(listarDentistasSchema, { apenasAtivos: 'sim' })).toThrow(ErroValidacao);
  });
});
