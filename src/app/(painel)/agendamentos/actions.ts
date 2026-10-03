'use server';

import { redirect } from 'next/navigation';
import { exigirClinica, exigirContexto, mensagemDe } from '@/lib/sessao';
import { agendamentoService } from '@/modules/agendamento';
import type { EstadoFormulario } from '../../formulario';

/** O relógio digitado é o da clínica (Brasília), independente do fuso do navegador. */
function instanteClinica(valor: FormDataEntryValue | null): string {
  const texto = String(valor ?? '');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(texto)) return `${texto}:00-03:00`;
  return texto;
}

export async function criar(_estado: EstadoFormulario | null, form: FormData): Promise<EstadoFormulario> {
  const ctx = await exigirContexto();
  exigirClinica(ctx);
  const procedimentoId = String(form.get('procedimento_id') ?? '');
  try {
    await agendamentoService.criar(ctx, {
      paciente_id: form.get('paciente_id'),
      dentista_id: form.get('dentista_id'),
      cadeira_id: form.get('cadeira_id'),
      procedimento_id: procedimentoId || undefined,
      data_hora_inicio: instanteClinica(form.get('data_hora_inicio')),
      data_hora_fim: instanteClinica(form.get('data_hora_fim')),
      emergencia: form.get('emergencia') === 'on',
    });
  } catch (erro) {
    return { erro: mensagemDe(erro) };
  }
  redirect('/agendamentos');
}

export async function iniciar(form: FormData): Promise<void> {
  const ctx = await exigirContexto();
  exigirClinica(ctx);
  await agendamentoService.iniciar(ctx, form.get('id'));
  redirect('/agendamentos');
}

export async function bloquear(_estado: EstadoFormulario | null, form: FormData): Promise<EstadoFormulario> {
  const ctx = await exigirContexto();
  exigirClinica(ctx);
  const motivo = String(form.get('motivo') ?? '').trim();
  try {
    await agendamentoService.criarBloqueio(ctx, {
      dentista_id: form.get('dentista_id'),
      inicio: instanteClinica(form.get('inicio')),
      fim: instanteClinica(form.get('fim')),
      motivo: motivo || undefined,
    });
  } catch (erro) {
    return { erro: mensagemDe(erro) };
  }
  redirect('/agendamentos');
}
