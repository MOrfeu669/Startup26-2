'use server';

import { redirect } from 'next/navigation';
import { exigirClinica, exigirContexto, mensagemDe } from '@/lib/sessao';
import { pacienteService, TIPOS_CANAL, type TipoCanal } from '@/modules/pacientes';
import type { EstadoFormulario } from '../../formulario';

function texto(form: FormData, campo: string): string {
  return String(form.get(campo) ?? '').trim();
}

function dadosDe(form: FormData, limparVazios: boolean) {
  const ausente = limparVazios ? null : undefined;
  const canais = TIPOS_CANAL.flatMap((canal) => {
    const contato = texto(form, `contato_${canal}`);
    if (!contato) return [];
    return [{ canal, contato, preferido: form.get('preferido') === canal }];
  });
  const responsavelNome = texto(form, 'responsavel_nome');
  const responsavelCpf = texto(form, 'responsavel_cpf');
  return {
    nome: texto(form, 'nome'),
    canais_comunicacao: canais,
    cpf: texto(form, 'cpf') || ausente,
    endereco: texto(form, 'endereco') || ausente,
    data_nascimento: texto(form, 'data_nascimento') || ausente,
    sexo: texto(form, 'sexo') || ausente,
    responsavel_legal:
      responsavelNome || responsavelCpf
        ? {
            nome: responsavelNome,
            cpf: responsavelCpf,
            telefone: texto(form, 'responsavel_telefone') || undefined,
          }
        : ausente,
  };
}

export async function cadastrar(_estado: EstadoFormulario | null, form: FormData): Promise<EstadoFormulario> {
  const ctx = await exigirContexto();
  exigirClinica(ctx);
  try {
    await pacienteService.cadastrar(ctx, dadosDe(form, false));
  } catch (erro) {
    return { erro: mensagemDe(erro) };
  }
  redirect('/pacientes');
}

export async function editar(_estado: EstadoFormulario | null, form: FormData): Promise<EstadoFormulario> {
  const ctx = await exigirContexto();
  exigirClinica(ctx);
  const id = texto(form, 'id');
  try {
    await pacienteService.editar(ctx, id, dadosDe(form, true));
  } catch (erro) {
    return { erro: mensagemDe(erro) };
  }
  redirect('/pacientes');
}
