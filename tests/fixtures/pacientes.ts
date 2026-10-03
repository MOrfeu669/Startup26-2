import type { Contexto } from '@/modules/autenticacao';
import { pacienteService, type CadastrarPacienteInput, type Paciente } from '@/modules/pacientes';

/** Cadastra um paciente pelo `pacienteService`. Requer contexto de qualquer papel da clínica. */
export async function criarPacienteDeTeste(
  ctx: Contexto,
  overrides: Partial<CadastrarPacienteInput> = {},
): Promise<Paciente> {
  const dados = {
    nome: 'João Pereira',
    canais_comunicacao: [{ canal: 'whatsapp', contato: '(54) 99999-0000', preferido: true }],
    ...overrides,
  } satisfies CadastrarPacienteInput;
  return pacienteService.cadastrar(ctx, dados);
}
