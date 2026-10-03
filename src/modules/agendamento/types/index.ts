import { z } from 'zod';
import type { AlertaCalculado } from '../services/regras';

export const STATUS_AGENDAMENTO = ['agendado', 'em_espera', 'iniciado', 'concluido', 'cancelado'] as const;
export type StatusAgendamento = (typeof STATUS_AGENDAMENTO)[number];

export interface Agendamento {
  id: string;
  clinica_id: string;
  paciente_id: string;
  dentista_id: string;
  cadeira_id: string;
  procedimento_id?: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  status: StatusAgendamento;
  iniciado_por?: string;
  concluido_em?: string;
  emergencia: boolean;
  criado_por: string;
  /** Calculado na leitura. Não é coluna. */
  alertas: AlertaCalculado[];
}

export interface BloqueioAgenda {
  id: string;
  clinica_id: string;
  dentista_id: string;
  inicio: string;
  fim: string;
  motivo?: string;
  criado_por: string;
}

const INSTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

const instanteSchema = (campo: string) => z.string(`${campo} obrigatório`).regex(INSTANTE, `${campo} inválido`);

function exigirFimDepoisDoInicio(inicio: string, fim: string, ctx: z.RefinementCtx): void {
  if (new Date(fim).getTime() <= new Date(inicio).getTime()) {
    ctx.addIssue({ code: 'custom', message: 'O término deve ser depois do início' });
  }
}

export const criarAgendamentoSchema = z
  .object({
    paciente_id: z.uuid('Paciente inválido'),
    dentista_id: z.uuid('Dentista inválido'),
    cadeira_id: z.uuid('Cadeira inválida'),
    procedimento_id: z.uuid('Procedimento inválido').optional(),
    data_hora_inicio: instanteSchema('Início'),
    data_hora_fim: instanteSchema('Término'),
    emergencia: z.boolean().optional().default(false),
  })
  .superRefine((dados, ctx) => exigirFimDepoisDoInicio(dados.data_hora_inicio, dados.data_hora_fim, ctx));
export type CriarAgendamentoInput = z.input<typeof criarAgendamentoSchema>;

export const criarBloqueioSchema = z
  .object({
    dentista_id: z.uuid('Dentista inválido'),
    inicio: instanteSchema('Início'),
    fim: instanteSchema('Término'),
    motivo: z.string().trim().min(1, 'Motivo inválido').optional(),
  })
  .superRefine((dados, ctx) => exigirFimDepoisDoInicio(dados.inicio, dados.fim, ctx));
export type CriarBloqueioInput = z.input<typeof criarBloqueioSchema>;

export const agendamentoIdSchema = z.uuid('Identificador inválido');
