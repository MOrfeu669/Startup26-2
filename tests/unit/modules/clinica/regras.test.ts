import { describe, expect, it } from 'vitest';
import {
  alertasDoAgendamento,
  atendeNoDia,
  dentroDoFuncionamento,
  ordenarCadeiras,
  proximaIdentificacaoCadeira,
  type Clinica,
} from '@/modules/clinica';

const clinica: Pick<Clinica, 'dias_atendimento' | 'horario_abertura' | 'horario_fechamento'> = {
  dias_atendimento: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
  horario_abertura: '08:00',
  horario_fechamento: '18:00',
};

describe('atendeNoDia (fuso da clínica)', () => {
  it('aceita dia listado em dias_atendimento', () => {
    expect(atendeNoDia(clinica, '2026-10-15T10:00:00-03:00')).toBe(true); // quinta
  });

  it('rejeita dia fora de dias_atendimento', () => {
    expect(atendeNoDia(clinica, '2026-10-17T10:00:00-03:00')).toBe(false); // sábado
  });

  it('usa o dia local, não o dia em UTC', () => {
    // 2026-10-17T01:00Z = sexta 22:00 em Brasília
    expect(atendeNoDia(clinica, '2026-10-17T01:00:00Z')).toBe(true);
    // 2026-10-19T02:30Z = domingo 23:30 em Brasília
    expect(atendeNoDia(clinica, '2026-10-19T02:30:00Z')).toBe(false);
  });
});

describe('dentroDoFuncionamento', () => {
  it('intervalo inteiro dentro do horário', () => {
    expect(dentroDoFuncionamento(clinica, '2026-10-15T08:00:00-03:00', '2026-10-15T18:00:00-03:00')).toBe(true);
    expect(dentroDoFuncionamento(clinica, '2026-10-15T14:00:00-03:00', '2026-10-15T15:00:00-03:00')).toBe(true);
  });

  it('começa antes da abertura', () => {
    expect(dentroDoFuncionamento(clinica, '2026-10-15T07:30:00-03:00', '2026-10-15T08:30:00-03:00')).toBe(false);
  });

  it('termina depois do fechamento', () => {
    expect(dentroDoFuncionamento(clinica, '2026-10-15T17:30:00-03:00', '2026-10-15T18:30:00-03:00')).toBe(false);
  });

  it('agendamento das 17:30 fica fora quando o fechamento passa para 17:00', () => {
    const ate17 = { horario_abertura: '08:00', horario_fechamento: '17:00' };
    expect(dentroDoFuncionamento(ate17, '2026-10-15T17:30:00-03:00', '2026-10-15T18:00:00-03:00')).toBe(false);
  });

  it('compara no fuso da clínica (instante em UTC)', () => {
    // 11:00Z–12:00Z = 08:00–09:00 em Brasília
    expect(dentroDoFuncionamento(clinica, '2026-10-15T11:00:00Z', '2026-10-15T12:00:00Z')).toBe(true);
    // 21:00Z–21:30Z = 18:00–18:30 em Brasília
    expect(dentroDoFuncionamento(clinica, '2026-10-15T21:00:00Z', '2026-10-15T21:30:00Z')).toBe(false);
  });

  it('intervalo vazio, invertido ou atravessando a meia-noite não está dentro', () => {
    const diaInteiro = { horario_abertura: '00:00', horario_fechamento: '23:59' };
    expect(dentroDoFuncionamento(clinica, '2026-10-15T10:00:00-03:00', '2026-10-15T10:00:00-03:00')).toBe(false);
    expect(dentroDoFuncionamento(clinica, '2026-10-15T11:00:00-03:00', '2026-10-15T10:00:00-03:00')).toBe(false);
    expect(dentroDoFuncionamento(diaInteiro, '2026-10-15T23:00:00-03:00', '2026-10-16T01:00:00-03:00')).toBe(false);
  });

  it('aceita horário com segundos vindo do banco', () => {
    const doBanco = { horario_abertura: '08:00:00', horario_fechamento: '18:00:00' };
    expect(dentroDoFuncionamento(doBanco, '2026-10-15T17:00:00-03:00', '2026-10-15T18:00:00-03:00')).toBe(true);
  });
});

describe('alertasDoAgendamento', () => {
  const inicio = '2026-10-15T09:00:00-03:00';
  const fim = '2026-10-15T10:00:00-03:00';

  it('sem alerta quando a cadeira está ativa e o horário cabe', () => {
    expect(alertasDoAgendamento({ clinica, cadeira: { ativa: true }, inicio, fim })).toEqual([]);
  });

  it('cadeira desativada gera "cadeira_indisponivel"', () => {
    expect(alertasDoAgendamento({ clinica, cadeira: { ativa: false }, inicio, fim })).toEqual(['cadeira_indisponivel']);
  });

  it('fora do horário gera "fora_de_horario"; os dois alertas podem coexistir', () => {
    const tarde = { inicio: '2026-10-15T17:30:00-03:00', fim: '2026-10-15T18:30:00-03:00' };
    expect(alertasDoAgendamento({ clinica, cadeira: { ativa: true }, ...tarde })).toEqual(['fora_de_horario']);
    expect(alertasDoAgendamento({ clinica, cadeira: { ativa: false }, ...tarde })).toEqual([
      'cadeira_indisponivel',
      'fora_de_horario',
    ]);
  });
});

describe('cadeiras', () => {
  it('próxima identificação segue a quantidade atual', () => {
    expect(proximaIdentificacaoCadeira([])).toBe('Cadeira 1');
    expect(proximaIdentificacaoCadeira(['Cadeira 1', 'Cadeira 2', 'Cadeira 3'])).toBe('Cadeira 4');
  });

  it('próxima identificação pula nomes já usados', () => {
    expect(proximaIdentificacaoCadeira(['Cadeira 1', 'cadeira 3'])).toBe('Cadeira 4');
    expect(proximaIdentificacaoCadeira(['Sala Azul', 'Cadeira 2'])).toBe('Cadeira 3');
  });

  it('ordena em ordem natural', () => {
    const ordenadas = ordenarCadeiras([
      { identificacao: 'Cadeira 10' },
      { identificacao: 'Cadeira 2' },
      { identificacao: 'Cadeira 1' },
    ]);
    expect(ordenadas.map((c) => c.identificacao)).toEqual(['Cadeira 1', 'Cadeira 2', 'Cadeira 10']);
  });
});
