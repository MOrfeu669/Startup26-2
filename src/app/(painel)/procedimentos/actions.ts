'use server';

import { redirect } from 'next/navigation';
import { exigirClinica, exigirContexto, mensagemDe } from '@/lib/sessao';
import { procedimentoService } from '@/modules/procedimentos';
import type { EstadoFormulario } from '../../formulario';

export async function criar(_estado: EstadoFormulario | null, form: FormData): Promise<EstadoFormulario> {
  const ctx = await exigirContexto();
  exigirClinica(ctx);
  try {
    await procedimentoService.criar(ctx, {
      nome: form.get('nome'),
      tempo_medio_minutos: Number(form.get('tempo_medio_minutos')),
      valor_medio: Number(form.get('valor_medio')),
    });
  } catch (erro) {
    return { erro: mensagemDe(erro) };
  }
  redirect('/procedimentos');
}

export async function editar(_estado: EstadoFormulario | null, form: FormData): Promise<EstadoFormulario> {
  const ctx = await exigirContexto();
  exigirClinica(ctx);
  try {
    await procedimentoService.editar(ctx, form.get('id'), {
      nome: form.get('nome'),
      tempo_medio_minutos: Number(form.get('tempo_medio_minutos')),
      valor_medio: Number(form.get('valor_medio')),
    });
  } catch (erro) {
    return { erro: mensagemDe(erro) };
  }
  redirect('/procedimentos');
}

export async function excluir(form: FormData): Promise<void> {
  const ctx = await exigirContexto();
  exigirClinica(ctx);
  await procedimentoService.excluir(ctx, form.get('id'));
  redirect('/procedimentos');
}
