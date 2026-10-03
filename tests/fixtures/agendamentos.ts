import type { Contexto } from '@/modules/autenticacao';
import { clinicaService, type Cadeira } from '@/modules/clinica';
import { type Dentista } from '@/modules/dentistas';
import { type Paciente } from '@/modules/pacientes';
import { criarDentistaDeTeste } from './dentistas';
import { criarPacienteDeTeste } from './pacientes';

/** 2026-10-15 é quinta-feira, dia de atendimento da clínica de teste (seg–sex, 08:00–18:00). */
export const QUINTA = '2026-10-15';
export const DOMINGO = '2026-10-18';

export function hora(hhmm: string, dia = QUINTA): string {
  return `${dia}T${hhmm}:00-03:00`;
}

export interface AgendaDeTeste {
  dentista: Dentista;
  paciente: Paciente;
  cadeira: Cadeira;
  cadeiras: Cadeira[];
}

/** Dentista, paciente e a Cadeira 1 da clínica, prontos para um agendamento. */
export async function prepararAgenda(ctx: Contexto, nomeDentista = 'Dr. Carlos'): Promise<AgendaDeTeste> {
  const { dentista } = await criarDentistaDeTeste(ctx, { nome: nomeDentista });
  const paciente = await criarPacienteDeTeste(ctx, { nome: 'João' });
  const cadeiras = await clinicaService.listarCadeiras(ctx);
  const cadeira = cadeiras.find((item) => item.identificacao === 'Cadeira 1');
  if (!cadeira) throw new Error('fixture: Cadeira 1 não encontrada');
  return { dentista, paciente, cadeira, cadeiras };
}

export function dadosAgendamento(
  agenda: Pick<AgendaDeTeste, 'dentista' | 'paciente' | 'cadeira'>,
  overrides: Record<string, unknown> = {},
) {
  return {
    paciente_id: agenda.paciente.id,
    dentista_id: agenda.dentista.id,
    cadeira_id: agenda.cadeira.id,
    data_hora_inicio: hora('14:00'),
    data_hora_fim: hora('14:30'),
    ...overrides,
  };
}
