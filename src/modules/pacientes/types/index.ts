import { z } from 'zod';
import { cpfSchema } from '@/lib/cpf';
import { exigeResponsavelLegal, normalizarCanais } from '../services/regras';

export const SEXOS = ['masculino', 'feminino', 'outro'] as const;
export type Sexo = (typeof SEXOS)[number];

export const TIPOS_CANAL = ['sms', 'email', 'whatsapp'] as const;
export type TipoCanal = (typeof TIPOS_CANAL)[number];

export interface CanalComunicacao {
  canal: TipoCanal;
  contato: string;
  preferido: boolean;
}

export interface ResponsavelLegal {
  nome: string;
  cpf: string; // 11 dígitos. ⚠️ PENDENTE: unicidade entre pacientes
  telefone?: string;
}

export interface Paciente {
  id: string;
  clinica_id: string;
  nome: string;
  canais_comunicacao: CanalComunicacao[];
  cpf?: string;
  endereco?: string;
  data_nascimento?: string; // YYYY-MM-DD
  /** Calculada a partir de `data_nascimento`; `null` quando a data não foi informada. Não é coluna. */
  idade: number | null;
  sexo?: Sexo;
  responsavel_legal?: ResponsavelLegal;
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;

const contatoTelefone = z.string('Contato obrigatório').trim().min(1, 'Contato obrigatório');

const canalSchema = z.discriminatedUnion(
  'canal',
  [
    z.object({
      canal: z.literal('email'),
      contato: z.email('Email do canal inválido'),
      preferido: z.boolean().optional(),
    }),
    z.object({ canal: z.literal('sms'), contato: contatoTelefone, preferido: z.boolean().optional() }),
    z.object({ canal: z.literal('whatsapp'), contato: contatoTelefone, preferido: z.boolean().optional() }),
  ],
  'Canal de comunicação inválido',
);

const canaisSchema = z
  .array(canalSchema, 'Informe pelo menos um canal de comunicação')
  .min(1, 'Informe pelo menos um canal de comunicação')
  .transform(normalizarCanais)
  .refine((canais) => canais.filter((canal) => canal.preferido).length === 1, 'Informe exatamente um canal preferido');

const cpfOpcionalSchema = z
  .string()
  .trim()
  .optional()
  .transform((valor) => (valor ? valor : undefined))
  .pipe(cpfSchema.optional());

const responsavelSchema = z.object({
  nome: z.string('Nome do responsável obrigatório').trim().min(1, 'Nome do responsável obrigatório'),
  cpf: cpfSchema,
  telefone: z
    .string()
    .trim()
    .min(1, 'Telefone do responsável inválido')
    .optional(),
});

const dataNascimentoSchema = z
  .string()
  .regex(DATA, 'Data de nascimento inválida')
  .refine((valor) => !Number.isNaN(Date.parse(`${valor}T12:00:00Z`)), 'Data de nascimento inválida');

export function criarCadastrarPacienteSchema(referencia: Date = new Date()) {
  return z
    .object({
      nome: z.string('Nome obrigatório').trim().min(1, 'Nome obrigatório'),
      canais_comunicacao: canaisSchema,
      cpf: cpfOpcionalSchema,
      endereco: z.string().trim().min(1, 'Endereço inválido').optional(),
      data_nascimento: dataNascimentoSchema.optional(),
      sexo: z.enum(SEXOS, 'Sexo inválido').optional(),
      responsavel_legal: responsavelSchema.optional(),
    })
    .superRefine((dados, ctx) => {
      if (exigeResponsavelLegal(dados.data_nascimento, referencia) && !dados.responsavel_legal) {
        ctx.addIssue({
          code: 'custom',
          path: ['responsavel_legal'],
          message: 'Responsável legal obrigatório para paciente menor de 18 anos',
        });
      }
    });
}

export type CadastrarPacienteInput = z.input<ReturnType<typeof criarCadastrarPacienteSchema>>;
export type PacienteValidado = z.infer<ReturnType<typeof criarCadastrarPacienteSchema>>;

export const editarPacienteSchema = z
  .object({
    nome: z.string().trim().min(1, 'Nome obrigatório').optional(),
    canais_comunicacao: canaisSchema.optional(),
    cpf: z.union([cpfOpcionalSchema, z.null()]).optional(),
    endereco: z.string().trim().min(1, 'Endereço inválido').nullable().optional(),
    data_nascimento: dataNascimentoSchema.nullable().optional(),
    sexo: z.enum(SEXOS, 'Sexo inválido').nullable().optional(),
    responsavel_legal: responsavelSchema.nullable().optional(),
  })
  .refine((dados) => Object.values(dados).some((valor) => valor !== undefined), {
    message: 'Informe ao menos um campo para alterar',
  });
export type EditarPacienteInput = z.input<typeof editarPacienteSchema>;

export const listarPacientesSchema = z.object({
  busca: z.string().trim().min(1).optional(),
});

export const pacienteIdSchema = z.uuid('Identificador inválido');
