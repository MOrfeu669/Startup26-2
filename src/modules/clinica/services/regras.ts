import { horaParaMinutos, partesLocais } from '@/lib/tempo';
import type { Cadeira, Clinica } from '../types';

/** Alertas calculados para um agendamento já marcado. Os nomes seguem os tipos de notificação da Feature 018. */
export type AlertaAgendamento = 'cadeira_indisponivel' | 'fora_de_horario';

type Instante = string | Date;

/** O dia (no fuso da clínica) em que `instante` cai está entre os `dias_atendimento`. */
export function atendeNoDia(clinica: Pick<Clinica, 'dias_atendimento'>, instante: Instante): boolean {
  return clinica.dias_atendimento.includes(partesLocais(instante).diaSemana);
}

/**
 * O intervalo inteiro [inicio, fim] cabe entre a abertura e o fechamento, no fuso da clínica.
 * Intervalo vazio/invertido ou que atravessa a meia-noite nunca está dentro do funcionamento.
 */
export function dentroDoFuncionamento(
  clinica: Pick<Clinica, 'horario_abertura' | 'horario_fechamento'>,
  inicio: Instante,
  fim: Instante,
): boolean {
  if (new Date(fim).getTime() <= new Date(inicio).getTime()) return false;
  const i = partesLocais(inicio);
  const f = partesLocais(fim);
  if (i.data !== f.data) return false;
  return i.minutos >= horaParaMinutos(clinica.horario_abertura) && f.minutos <= horaParaMinutos(clinica.horario_fechamento);
}

/**
 * Alertas de um agendamento já marcado diante da configuração atual da clínica (cadeira desativada ou
 * horário alterado). Não cancela nada. Quem chama (Feature 006) decide a quais agendamentos aplicar.
 */
export function alertasDoAgendamento(params: {
  clinica: Pick<Clinica, 'horario_abertura' | 'horario_fechamento'>;
  cadeira: Pick<Cadeira, 'ativa'>;
  inicio: Instante;
  fim: Instante;
}): AlertaAgendamento[] {
  const alertas: AlertaAgendamento[] = [];
  if (!params.cadeira.ativa) alertas.push('cadeira_indisponivel');
  if (!dentroDoFuncionamento(params.clinica, params.inicio, params.fim)) alertas.push('fora_de_horario');
  return alertas;
}

const normalizar = (identificacao: string) => identificacao.trim().toLowerCase();

/** Próxima "Cadeira N" livre, a partir da quantidade atual (ativas e inativas). */
export function proximaIdentificacaoCadeira(existentes: readonly string[]): string {
  const usadas = new Set(existentes.map(normalizar));
  let numero = existentes.length + 1;
  while (usadas.has(normalizar(`Cadeira ${numero}`))) numero++;
  return `Cadeira ${numero}`;
}

const ordemNatural = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

/** Ordena por identificação com números em ordem natural ("Cadeira 2" antes de "Cadeira 10"). */
export function ordenarCadeiras<T extends Pick<Cadeira, 'identificacao'>>(cadeiras: readonly T[]): T[] {
  return [...cadeiras].sort((a, b) => ordemNatural.compare(a.identificacao, b.identificacao));
}
