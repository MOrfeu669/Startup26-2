'use server';

import { redirect } from 'next/navigation';
import { exigirContexto, mensagemDe } from '@/lib/sessao';
import { DIAS_SEMANA, type DiaSemana } from '@/lib/tempo';
import { clinicaService } from '@/modules/clinica';
import type { EstadoFormulario } from '../../formulario';

function diasDe(form: FormData): DiaSemana[] {
  return form.getAll('dias_atendimento').filter((dia): dia is DiaSemana => DIAS_SEMANA.includes(dia as DiaSemana));
}

export async function criarClinica(_estado: EstadoFormulario | null, form: FormData): Promise<EstadoFormulario> {
  const ctx = await exigirContexto();
  try {
    await clinicaService.criar(ctx, {
      nome: form.get('nome'),
      dias_atendimento: diasDe(form),
      horario_abertura: form.get('horario_abertura') || undefined,
      horario_fechamento: form.get('horario_fechamento') || undefined,
      cadeiras: Number(form.get('cadeiras')),
    });
  } catch (erro) {
    return { erro: mensagemDe(erro) };
  }
  redirect('/clinica');
}

export async function salvarHorario(_estado: EstadoFormulario | null, form: FormData): Promise<EstadoFormulario> {
  const ctx = await exigirContexto();
  try {
    await clinicaService.atualizarHorario(ctx, {
      horario_abertura: form.get('horario_abertura'),
      horario_fechamento: form.get('horario_fechamento'),
    });
  } catch (erro) {
    return { erro: mensagemDe(erro) };
  }
  redirect('/clinica');
}

export async function salvarDias(_estado: EstadoFormulario | null, form: FormData): Promise<EstadoFormulario> {
  const ctx = await exigirContexto();
  try {
    await clinicaService.atualizarDiasAtendimento(ctx, { dias_atendimento: diasDe(form) });
  } catch (erro) {
    return { erro: mensagemDe(erro) };
  }
  redirect('/clinica');
}

export async function novaCadeira(): Promise<void> {
  const ctx = await exigirContexto();
  await clinicaService.adicionarCadeira(ctx);
  redirect('/clinica');
}

export async function desativar(form: FormData): Promise<void> {
  const ctx = await exigirContexto();
  await clinicaService.desativarCadeira(ctx, form.get('cadeira_id'));
  redirect('/clinica');
}
