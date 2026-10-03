import { describe, expect, it } from 'vitest';
import { ErroValidacao } from '@/lib/erros';
import { validar } from '@/lib/validacao';
import { atualizarHorarioSchema, criarClinicaSchema } from '@/modules/clinica';

const base = { nome: 'Clínica', dias_atendimento: ['segunda'], cadeiras: 1 };

describe('criarClinicaSchema', () => {
  it('aplica o horário padrão 08:00–18:00 quando não informado', () => {
    expect(validar(criarClinicaSchema, base)).toMatchObject({ horario_abertura: '08:00', horario_fechamento: '18:00' });
  });

  it('normaliza os dias: sem repetição e na ordem da semana', () => {
    const dados = validar(criarClinicaSchema, { ...base, dias_atendimento: ['sabado', 'segunda', 'sabado', 'domingo'] });
    expect(dados.dias_atendimento).toEqual(['domingo', 'segunda', 'sabado']);
  });

  it('exige ao menos um dia de atendimento válido', () => {
    expect(() => validar(criarClinicaSchema, { ...base, dias_atendimento: [] })).toThrow(ErroValidacao);
    expect(() => validar(criarClinicaSchema, { ...base, dias_atendimento: ['feriado'] })).toThrow(ErroValidacao);
  });

  it('exige nome e quantidade inteira de cadeiras (ao menos uma)', () => {
    expect(() => validar(criarClinicaSchema, { ...base, nome: '  ' })).toThrow('Nome obrigatório');
    expect(() => validar(criarClinicaSchema, { ...base, cadeiras: 0 })).toThrow(ErroValidacao);
    expect(() => validar(criarClinicaSchema, { ...base, cadeiras: 2.5 })).toThrow(ErroValidacao);
  });

  it('ignora admin_id vindo da entrada (o Admin é sempre o usuário autenticado)', () => {
    expect(validar(criarClinicaSchema, { ...base, admin_id: 'outro' })).not.toHaveProperty('admin_id');
  });
});

describe('atualizarHorarioSchema', () => {
  it('aceita HH:MM e descarta segundos', () => {
    expect(validar(atualizarHorarioSchema, { horario_abertura: '07:30:00', horario_fechamento: '17:00' })).toEqual({
      horario_abertura: '07:30',
      horario_fechamento: '17:00',
    });
  });

  it('rejeita abertura igual ou depois do fechamento', () => {
    for (const [abertura, fechamento] of [['18:00', '08:00'], ['08:00', '08:00']] as const) {
      expect(() =>
        validar(atualizarHorarioSchema, { horario_abertura: abertura, horario_fechamento: fechamento }),
      ).toThrow('O horário de abertura deve ser anterior ao de fechamento');
    }
  });

  it('rejeita formato inválido', () => {
    expect(() => validar(atualizarHorarioSchema, { horario_abertura: '8h', horario_fechamento: '18:00' })).toThrow(
      'Horário inválido (use HH:MM)',
    );
    expect(() => validar(atualizarHorarioSchema, { horario_abertura: '08:00', horario_fechamento: '24:00' })).toThrow(
      ErroValidacao,
    );
  });
});
