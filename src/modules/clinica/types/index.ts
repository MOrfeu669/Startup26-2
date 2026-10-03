import { z } from 'zod';
import { DIAS_SEMANA, horaParaMinutos, horaSchemaRegex, type DiaSemana } from '@/lib/tempo';

export const HORARIO_PADRAO = { abertura: '08:00', fechamento: '18:00' } as const;
/** Limite técnico de cadeiras criadas de uma vez na criação da clínica (evita erro de digitação). */
export const MAX_CADEIRAS_INICIAIS = 100;

export interface Cadeira {
  id: string;
  clinica_id: string;
  identificacao: string; // ex: "Cadeira 1"
  ativa: boolean; // desativada = indisponível para novos agendamentos, gera alerta nos futuros já marcados
}

export interface Clinica {
  id: string;
  nome: string;
  admin_id: string; // um Admin gerencia exatamente uma clínica
  dias_atendimento: DiaSemana[]; // na ordem de DIAS_SEMANA
  horario_abertura: string; // "HH:MM", aplicado a todos os dias de atendimento
  horario_fechamento: string; // "HH:MM"
  cadeiras: Cadeira[];
}

export const diaSemanaSchema = z.enum(DIAS_SEMANA, 'Dia da semana inválido');

const horaSchema = z
  .string('Horário inválido (use HH:MM)')
  .regex(horaSchemaRegex, 'Horário inválido (use HH:MM)')
  .transform((hora) => hora.slice(0, 5));

const diasAtendimentoSchema = z
  .array(diaSemanaSchema, 'Selecione os dias de atendimento')
  .min(1, 'Selecione ao menos um dia de atendimento')
  .transform((dias) => DIAS_SEMANA.filter((dia) => dias.includes(dia)));

const MENSAGEM_HORARIO = 'O horário de abertura deve ser anterior ao de fechamento';
const horarioValido = (h: { horario_abertura: string; horario_fechamento: string }) =>
  horaParaMinutos(h.horario_abertura) < horaParaMinutos(h.horario_fechamento);

export const criarClinicaSchema = z
  .object({
    nome: z.string('Nome obrigatório').trim().min(1, 'Nome obrigatório'),
    dias_atendimento: diasAtendimentoSchema,
    horario_abertura: horaSchema.default(HORARIO_PADRAO.abertura),
    horario_fechamento: horaSchema.default(HORARIO_PADRAO.fechamento),
    cadeiras: z
      .number('Informe a quantidade de cadeiras')
      .int('A quantidade de cadeiras deve ser um número inteiro')
      .min(1, 'Informe ao menos uma cadeira')
      .max(MAX_CADEIRAS_INICIAIS, `Informe no máximo ${MAX_CADEIRAS_INICIAIS} cadeiras`),
  })
  .refine(horarioValido, { message: MENSAGEM_HORARIO, path: ['horario_fechamento'] });
export type CriarClinicaInput = z.input<typeof criarClinicaSchema>;

export const atualizarHorarioSchema = z
  .object({
    horario_abertura: horaSchema,
    horario_fechamento: horaSchema,
  })
  .refine(horarioValido, { message: MENSAGEM_HORARIO, path: ['horario_fechamento'] });
export type AtualizarHorarioInput = z.input<typeof atualizarHorarioSchema>;

export const atualizarDiasAtendimentoSchema = z.object({
  dias_atendimento: diasAtendimentoSchema,
});
export type AtualizarDiasAtendimentoInput = z.input<typeof atualizarDiasAtendimentoSchema>;

export const adicionarCadeiraSchema = z.object({
  /** Opcional: sem identificação, a cadeira recebe a próxima "Cadeira N" livre. */
  identificacao: z.string().trim().min(1, 'Identificação obrigatória').optional(),
});
export type AdicionarCadeiraInput = z.input<typeof adicionarCadeiraSchema>;

export const listarCadeirasSchema = z.object({
  apenasAtivas: z.boolean().optional(),
});
export type ListarCadeirasInput = z.input<typeof listarCadeirasSchema>;

export const idSchema = z.uuid('Identificador inválido');
