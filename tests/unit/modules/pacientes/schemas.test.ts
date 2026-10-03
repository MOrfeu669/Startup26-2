import { describe, expect, it } from 'vitest';
import { ErroValidacao } from '@/lib/erros';
import { validar } from '@/lib/validacao';
import { criarCadastrarPacienteSchema, editarPacienteSchema } from '@/modules/pacientes';

const HOJE = new Date('2026-10-03T15:00:00Z');
const schema = criarCadastrarPacienteSchema(HOJE);

const completo = {
  nome: 'João Pereira',
  canais_comunicacao: [
    { canal: 'whatsapp', contato: '(54) 99999-0000', preferido: true },
    { canal: 'email', contato: 'joao@email.com', preferido: false },
  ],
  cpf: '000.000.000-00',
  endereco: 'Rua das Flores, 123',
  data_nascimento: '1990-05-10',
  sexo: 'masculino',
};

describe('cadastrarPacienteSchema', () => {
  it('aceita o exemplo da spec e guarda o CPF só com dígitos', () => {
    expect(validar(schema, completo)).toMatchObject({
      nome: 'João Pereira',
      cpf: '00000000000',
      endereco: 'Rua das Flores, 123',
      data_nascimento: '1990-05-10',
      sexo: 'masculino',
      canais_comunicacao: completo.canais_comunicacao,
    });
  });

  it('exige nome e pelo menos um canal', () => {
    expect(() => validar(schema, { ...completo, nome: '  ' })).toThrow('Nome obrigatório');
    expect(() => validar(schema, { nome: 'João Pereira' })).toThrow('Informe pelo menos um canal de comunicação');
    expect(() => validar(schema, { nome: 'João Pereira', canais_comunicacao: [] })).toThrow(
      'Informe pelo menos um canal de comunicação',
    );
  });

  it('marca o único canal como preferido e recusa dois preferidos', () => {
    expect(
      validar(schema, {
        nome: 'João Pereira',
        canais_comunicacao: [{ canal: 'whatsapp', contato: '(54) 99999-0000' }],
      }).canais_comunicacao,
    ).toEqual([{ canal: 'whatsapp', contato: '(54) 99999-0000', preferido: true }]);

    expect(() =>
      validar(schema, {
        nome: 'João Pereira',
        canais_comunicacao: [
          { canal: 'sms', contato: '1', preferido: true },
          { canal: 'whatsapp', contato: '2', preferido: true },
        ],
      }),
    ).toThrow('Informe exatamente um canal preferido');
  });

  it('exige responsável legal apenas para menor de 18 com data informada', () => {
    expect(() =>
      validar(schema, {
        nome: 'Maria Pereira',
        canais_comunicacao: [{ canal: 'sms', contato: '(54) 98888-0000', preferido: true }],
        data_nascimento: '2015-03-20',
      }),
    ).toThrow('Responsável legal obrigatório para paciente menor de 18 anos');

    const menor = validar(schema, {
      nome: 'Maria Pereira',
      canais_comunicacao: [{ canal: 'sms', contato: '(54) 98888-0000', preferido: true }],
      data_nascimento: '2015-03-20',
      responsavel_legal: { nome: 'João Pereira', cpf: '000.000.000-00' },
    });
    expect(menor.responsavel_legal).toEqual({ nome: 'João Pereira', cpf: '00000000000' });

    expect(
      validar(schema, {
        nome: 'Adulto',
        canais_comunicacao: [{ canal: 'sms', contato: '1', preferido: true }],
      }),
    ).not.toHaveProperty('responsavel_legal');
  });

  it('rejeita canal de email inválido e sexo fora das opções', () => {
    expect(() =>
      validar(schema, { nome: 'Ana', canais_comunicacao: [{ canal: 'email', contato: 'nao-e-email', preferido: true }] }),
    ).toThrow('Email do canal inválido');
    expect(() => validar(schema, { ...completo, sexo: 'nao-binario' })).toThrow(ErroValidacao);
  });
});

describe('editarPacienteSchema', () => {
  it('aceita alteração parcial e limpeza de campos opcionais', () => {
    expect(validar(editarPacienteSchema, { endereco: 'Rua Nova, 1' })).toEqual({ endereco: 'Rua Nova, 1' });
    expect(validar(editarPacienteSchema, { cpf: null })).toEqual({ cpf: null });
    expect(validar(editarPacienteSchema, { data_nascimento: null })).toEqual({ data_nascimento: null });
  });

  it('exige ao menos um campo', () => {
    expect(() => validar(editarPacienteSchema, {})).toThrow('Informe ao menos um campo para alterar');
  });
});
