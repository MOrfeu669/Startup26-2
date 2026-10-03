import { describe, expect, it } from 'vitest';
import { sugerirTermino } from '@/modules/procedimentos';

describe('sugerirTermino', () => {
  it('soma o tempo médio ao início sem alterar o instante de partida', () => {
    const inicio = new Date('2026-10-15T14:00:00-03:00');
    expect(sugerirTermino(inicio, 30).toISOString()).toBe('2026-10-15T17:30:00.000Z');
    expect(inicio.toISOString()).toBe('2026-10-15T17:00:00.000Z');
  });
});
