import type { Procedimento } from '../types';

const ordemAlfabetica = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

export function ordenarProcedimentos<T extends Pick<Procedimento, 'nome'>>(procedimentos: readonly T[]): T[] {
  return [...procedimentos].sort((a, b) => ordemAlfabetica.compare(a.nome, b.nome));
}

/** Sugestão de término a partir do tempo médio. O agendamento pode gravar outro intervalo sem alterar o procedimento. */
export function sugerirTermino(inicio: Date, tempoMedioMinutos: number): Date {
  return new Date(inicio.getTime() + tempoMedioMinutos * 60_000);
}
