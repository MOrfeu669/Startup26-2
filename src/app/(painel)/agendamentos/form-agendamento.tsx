'use client';

import type { FormEvent } from 'react';
import { Formulario } from '../../formulario';
import { criar } from './actions';

interface Opcao {
  id: string;
  rotulo: string;
}

interface ProcedimentoOpcao extends Opcao {
  minutos: number;
}

function sugerirDuracao(form: HTMLFormElement) {
  const procedimento = form.elements.namedItem('procedimento_id') as HTMLSelectElement | null;
  const inicio = form.elements.namedItem('data_hora_inicio') as HTMLInputElement | null;
  const fim = form.elements.namedItem('data_hora_fim') as HTMLInputElement | null;
  const minutos = Number(procedimento?.selectedOptions[0]?.dataset.minutos || 0);
  if (!procedimento || !inicio?.value || !fim || !minutos) return;
  const [data, hora] = inicio.value.split('T');
  const [h, m] = (hora ?? '').split(':').map(Number);
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return;
  const total = h * 60 + m + minutos;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  fim.value = `${data}T${hh}:${mm}`;
}

/** Formulário de agendamento. Ao escolher o procedimento, o término sugerido é o tempo médio — e continua editável. */
export function FormAgendamento({
  pacientes,
  dentistas,
  cadeiras,
  procedimentos,
}: {
  pacientes: Opcao[];
  dentistas: Opcao[];
  cadeiras: Opcao[];
  procedimentos: ProcedimentoOpcao[];
}) {
  function aoMudar(evento: FormEvent<HTMLSelectElement | HTMLInputElement>) {
    const form = evento.currentTarget.form;
    if (form) sugerirDuracao(form);
  }

  return (
    <Formulario action={criar}>
      <label>
        Paciente
        <select name="paciente_id" required defaultValue="">
          <option value="" disabled>
            Selecione
          </option>
          {pacientes.map((paciente) => (
            <option key={paciente.id} value={paciente.id}>
              {paciente.rotulo}
            </option>
          ))}
        </select>
      </label>
      <label>
        Dentista
        <select name="dentista_id" required defaultValue="">
          <option value="" disabled>
            Selecione
          </option>
          {dentistas.map((dentista) => (
            <option key={dentista.id} value={dentista.id}>
              {dentista.rotulo}
            </option>
          ))}
        </select>
      </label>
      <label>
        Cadeira
        <select name="cadeira_id" required defaultValue="">
          <option value="" disabled>
            Selecione
          </option>
          {cadeiras.map((cadeira) => (
            <option key={cadeira.id} value={cadeira.id}>
              {cadeira.rotulo}
            </option>
          ))}
        </select>
      </label>
      <label>
        Procedimento (opcional)
        <select name="procedimento_id" defaultValue="" onChange={aoMudar}>
          <option value="">Sem procedimento</option>
          {procedimentos.map((procedimento) => (
            <option key={procedimento.id} value={procedimento.id} data-minutos={procedimento.minutos}>
              {procedimento.rotulo}
            </option>
          ))}
        </select>
      </label>
      <label>
        Início (horário de Brasília)
        <input name="data_hora_inicio" type="datetime-local" required onChange={aoMudar} />
      </label>
      <label>
        Término (horário de Brasília)
        <input name="data_hora_fim" type="datetime-local" required />
      </label>
      <label>
        <input name="emergencia" type="checkbox" /> Emergência já ocorrida (não aplica as validações de horário e conflito)
      </label>
      <button type="submit">Agendar</button>
    </Formulario>
  );
}
