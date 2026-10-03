// ⚠️ PENDENTE (técnico): fuso de referência não definido nas specs; adotado provisoriamente o de Brasília.
export const FUSO_CLINICA = 'America/Sao_Paulo';

export const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];

export interface PartesLocais {
  /** Data no fuso da clínica, `YYYY-MM-DD`. */
  data: string;
  diaSemana: DiaSemana;
  /** Minutos desde 00:00 no fuso da clínica. */
  minutos: number;
}

const formatador = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO_CLINICA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  weekday: 'short',
});

const INDICE_DIA: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Converte um instante (ISO com fuso, ou Date) para data, dia da semana e minutos no fuso da clínica. */
export function partesLocais(instante: string | Date): PartesLocais {
  const data = typeof instante === 'string' ? new Date(instante) : instante;
  if (Number.isNaN(data.getTime())) throw new Error(`Instante inválido: ${String(instante)}`);
  const p = Object.fromEntries(formatador.formatToParts(data).map((parte) => [parte.type, parte.value]));
  return {
    data: `${p.year}-${p.month}-${p.day}`,
    diaSemana: DIAS_SEMANA[INDICE_DIA[p.weekday!]!]!,
    minutos: Number(p.hour) * 60 + Number(p.minute),
  };
}

/** "HH:MM" ou "HH:MM:SS" → minutos desde 00:00. */
export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(':');
  return Number(h) * 60 + Number(m);
}

export const horaSchemaRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
