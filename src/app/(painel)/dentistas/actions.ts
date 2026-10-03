'use server';

import { redirect } from 'next/navigation';
import { exigirClinica, exigirContexto, mensagemDe } from '@/lib/sessao';
import { dentistaService } from '@/modules/dentistas';
import type { EstadoFormulario } from '../../formulario';

function especialidadesDe(form: FormData): string[] {
  const texto = String(form.get('especialidades') ?? '');
  return texto
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function cadastrar(_estado: EstadoFormulario | null, form: FormData): Promise<EstadoFormulario> {
  const ctx = await exigirContexto();
  exigirClinica(ctx);
  try {
    await dentistaService.cadastrar(ctx, {
      nome: form.get('nome'),
      cro: form.get('cro'),
      telefone: form.get('telefone'),
      cpf: form.get('cpf'),
      email_login: form.get('email_login'),
      senha: form.get('senha'),
      especialidades: especialidadesDe(form),
    });
  } catch (erro) {
    return { erro: mensagemDe(erro) };
  }
  redirect('/dentistas');
}

export async function editar(_estado: EstadoFormulario | null, form: FormData): Promise<EstadoFormulario> {
  const ctx = await exigirContexto();
  exigirClinica(ctx);
  try {
    await dentistaService.editar(ctx, form.get('id'), {
      telefone: form.get('telefone'),
      especialidades: especialidadesDe(form),
    });
  } catch (erro) {
    return { erro: mensagemDe(erro) };
  }
  redirect('/dentistas');
}

export async function remover(form: FormData): Promise<void> {
  const ctx = await exigirContexto();
  exigirClinica(ctx);
  await dentistaService.remover(ctx, form.get('id'));
  redirect('/dentistas');
}
