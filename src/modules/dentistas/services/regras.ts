import type { Dentista } from '../types';

const chave = (texto: string) => texto.trim().toLocaleLowerCase('pt-BR');

/** Remove repetições sem diferenciar maiúsculas, mantendo a primeira grafia e a ordem informada. */
export function normalizarEspecialidades(especialidades: readonly string[]): string[] {
  const vistas = new Set<string>();
  const resultado: string[] = [];
  for (const especialidade of especialidades) {
    const texto = especialidade.trim();
    if (!texto || vistas.has(chave(texto))) continue;
    vistas.add(chave(texto));
    resultado.push(texto);
  }
  return resultado;
}

const ordemAlfabetica = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

/** Ordem de exibição na seleção do agendamento: por nome, sem diferenciar acentos e maiúsculas. */
export function ordenarDentistas<T extends Pick<Dentista, 'nome'>>(dentistas: readonly T[]): T[] {
  return [...dentistas].sort((a, b) => ordemAlfabetica.compare(a.nome, b.nome));
}
