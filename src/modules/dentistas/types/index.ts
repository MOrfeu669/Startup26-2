import { z } from 'zod';
import { cpfSchema } from '@/lib/cpf';
import { cadastrarUsuarioSchema } from '@/modules/autenticacao';
import { normalizarEspecialidades } from '../services/regras';

export interface Dentista {
  id: string;
  usuario_id: string; // login com papel `dentista` (Feature 001)
  clinica_id: string;
  nome: string;
  cro: string;
  telefone: string;
  cpf: string; // só os 11 dígitos
  especialidades: string[]; // informativo: não restringe procedimentos nem agendamentos
  ativo: boolean; // false após a remoção; agendamentos futuros ficam com alerta (Feature 006)
}

const textoObrigatorio = (campo: string) =>
  z.string(`${campo} obrigatório`).trim().min(1, `${campo} obrigatório`);

const especialidadesSchema = z
  .array(z.string('Especialidade inválida').trim().min(1, 'Especialidade vazia'), 'Especialidades inválidas')
  .transform(normalizarEspecialidades);

const camposCadastrais = {
  nome: textoObrigatorio('Nome'),
  cro: textoObrigatorio('CRO'),
  telefone: textoObrigatorio('Telefone'),
  cpf: cpfSchema,
};

export const cadastrarDentistaSchema = z.object({
  ...camposCadastrais,
  especialidades: especialidadesSchema.default([]),
  email_login: cadastrarUsuarioSchema.shape.email,
  senha: cadastrarUsuarioSchema.shape.senha,
});
export type CadastrarDentistaInput = z.input<typeof cadastrarDentistaSchema>;

export const editarDentistaSchema = z
  .object({ ...camposCadastrais, especialidades: especialidadesSchema })
  .partial()
  .refine((dados) => Object.values(dados).some((valor) => valor !== undefined), {
    message: 'Informe ao menos um campo para alterar',
  });
export type EditarDentistaInput = z.input<typeof editarDentistaSchema>;

export const listarDentistasSchema = z.object({
  apenasAtivos: z.boolean().optional(),
});
export type ListarDentistasInput = z.input<typeof listarDentistasSchema>;

export const dentistaIdSchema = z.uuid('Identificador inválido');
