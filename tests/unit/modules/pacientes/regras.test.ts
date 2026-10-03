import { describe, expect, it } from 'vitest';
import { calcularIdade, exigeResponsavelLegal, normalizarCanais } from '@/modules/pacientes';

const em = (iso: string) => new Date(`${iso}T15:00:00Z`);

describe('calcularIdade', () => {
  it('conta anos completos e não avança a idade antes do aniversário', () => {
    expect(calcularIdade('1990-05-10', em('2026-10-03'))).toBe(36);
    expect(calcularIdade('1990-05-10', em('2026-05-10'))).toBe(36);
    expect(calcularIdade('1990-05-10', em('2026-05-09'))).toBe(35);
  });
});

describe('exigeResponsavelLegal', () => {
  it('só exige responsável quando a data informada indica menos de 18 anos', () => {
    expect(exigeResponsavelLegal(undefined, em('2026-10-03'))).toBe(false);
    expect(exigeResponsavelLegal('2015-03-20', em('2026-10-03'))).toBe(true);
    expect(exigeResponsavelLegal('2008-10-04', em('2026-10-03'))).toBe(true);
    expect(exigeResponsavelLegal('2008-10-03', em('2026-10-03'))).toBe(false);
  });
});

describe('normalizarCanais', () => {
  it('marca como preferido o único canal informado', () => {
    expect(normalizarCanais([{ canal: 'whatsapp', contato: '(54) 99999-0000', preferido: false }])).toEqual([
      { canal: 'whatsapp', contato: '(54) 99999-0000', preferido: true },
    ]);
  });

  it('preserva a escolha quando há mais de um canal', () => {
    expect(
      normalizarCanais([
        { canal: 'whatsapp', contato: '1', preferido: true },
        { canal: 'email', contato: 'a@b.com' },
      ]),
    ).toEqual([
      { canal: 'whatsapp', contato: '1', preferido: true },
      { canal: 'email', contato: 'a@b.com', preferido: false },
    ]);
  });
});
