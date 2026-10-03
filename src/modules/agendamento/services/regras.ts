import { alertasDoAgendamento, type AlertaAgendamento } from '@/modules/clinica';
import type { Cadeira, Clinica } from '@/modules/clinica';

export type AlertaCalculado = AlertaAgendamento | 'dentista_indisponivel';

/**
 * Alertas de um agendamento já gravado, calculados na leitura. Não altera o status.
 * Cadeira inativa e horário vêm da Feature 002; dentista inativo, da Feature 003.
 */
export function alertasDoRegistro(params: {
  clinica: Pick<Clinica, 'horario_abertura' | 'horario_fechamento'>;
  cadeira: Pick<Cadeira, 'ativa'>;
  dentistaAtivo: boolean;
  inicio: string;
  fim: string;
}): AlertaCalculado[] {
  const alertas: AlertaCalculado[] = [...alertasDoAgendamento(params)];
  if (!params.dentistaAtivo) alertas.push('dentista_indisponivel');
  return alertas;
}

export function intervalosSobrepoem(inicioA: string, fimA: string, inicioB: string, fimB: string): boolean {
  return new Date(inicioA).getTime() < new Date(fimB).getTime() && new Date(inicioB).getTime() < new Date(fimA).getTime();
}
