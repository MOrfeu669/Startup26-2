import { describe, expect, it } from 'vitest';
import { horaParaMinutos, partesLocais } from '@/lib/tempo';

describe('partesLocais (fuso da clínica)', () => {
  it('converte um instante UTC para data, dia e minutos em America/Sao_Paulo', () => {
    // 2026-10-15T17:00Z = 14:00 em Brasília (UTC-3), quinta-feira
    expect(partesLocais('2026-10-15T17:00:00Z')).toEqual({ data: '2026-10-15', diaSemana: 'quinta', minutos: 840 });
  });

  it('respeita a virada de dia pelo fuso local', () => {
    // 2026-10-19T02:30Z = domingo 23:30 em Brasília
    expect(partesLocais('2026-10-19T02:30:00Z')).toMatchObject({ data: '2026-10-18', diaSemana: 'domingo' });
  });

  it('aceita ISO com offset explícito', () => {
    expect(partesLocais('2026-10-15T14:00:00-03:00').minutos).toBe(840);
  });
});

describe('horaParaMinutos', () => {
  it('aceita HH:MM e HH:MM:SS', () => {
    expect(horaParaMinutos('08:00')).toBe(480);
    expect(horaParaMinutos('17:30:00')).toBe(1050);
  });
});
