import { partesLocais } from '@/lib/tempo';
import type { CanalComunicacao, Paciente } from '../types';

const ordemAlfabetica = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

/** Idade em anos completos no fuso da clínica. Não é persistida. */
export function calcularIdade(dataNascimento: string, referencia: Date = new Date()): number {
  const [anoN, mesN, diaN] = dataNascimento.split('-').map(Number) as [number, number, number];
  const [anoH, mesH, diaH] = partesLocais(referencia).data.split('-').map(Number) as [number, number, number];
  let idade = anoH! - anoN!;
  if (mesH! < mesN! || (mesH === mesN && diaH! < diaN!)) idade -= 1;
  return idade;
}

/** Responsável legal só é exigido quando a data de nascimento informada indica menos de 18 anos. */
export function exigeResponsavelLegal(dataNascimento: string | undefined, referencia: Date = new Date()): boolean {
  if (!dataNascimento) return false;
  return calcularIdade(dataNascimento, referencia) < 18;
}

/** Um único canal informado vira o preferido. Com vários, exatamente um já precisa estar marcado. */
export function normalizarCanais(
  canais: readonly { canal: CanalComunicacao['canal']; contato: string; preferido?: boolean }[],
): CanalComunicacao[] {
  if (canais.length === 1) {
    return [{ canal: canais[0]!.canal, contato: canais[0]!.contato, preferido: true }];
  }
  return canais.map((canal) => ({ canal: canal.canal, contato: canal.contato, preferido: canal.preferido === true }));
}

export function ordenarPacientes<T extends Pick<Paciente, 'nome'>>(pacientes: readonly T[]): T[] {
  return [...pacientes].sort((a, b) => ordemAlfabetica.compare(a.nome, b.nome));
}

/** Preferido primeiro; os demais na ordem em que foram gravados. */
export function ordenarCanais<T extends Pick<CanalComunicacao, 'preferido'>>(canais: readonly T[]): T[] {
  return [...canais].sort((a, b) => Number(b.preferido) - Number(a.preferido));
}
