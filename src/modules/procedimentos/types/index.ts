import { z } from 'zod';

export interface Procedimento {
  id: string;
  clinica_id: string;
  nome: string;
  tempo_medio_minutos: number;
  valor_medio: number;
  /** Vazio até a Feature 017. Não há reserva nem baixa no agendamento. */
  materiais: [];
}

const campos = {
  nome: z.string('Nome obrigatório').trim().min(1, 'Nome obrigatório'),
  tempo_medio_minutos: z
    .number('Tempo médio obrigatório')
    .int('Tempo médio deve ser um número inteiro de minutos')
    .positive('Tempo médio deve ser maior que zero'),
  valor_medio: z.number('Valor médio obrigatório').nonnegative('Valor médio não pode ser negativo'),
};

export const criarProcedimentoSchema = z.object(campos);
export type CriarProcedimentoInput = z.input<typeof criarProcedimentoSchema>;

export const editarProcedimentoSchema = z
  .object({
    nome: campos.nome.optional(),
    tempo_medio_minutos: campos.tempo_medio_minutos.optional(),
    valor_medio: campos.valor_medio.optional(),
  })
  .refine((dados) => Object.values(dados).some((valor) => valor !== undefined), {
    message: 'Informe ao menos um campo para alterar',
  });

export const procedimentoIdSchema = z.uuid('Identificador inválido');
