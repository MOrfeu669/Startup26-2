import Link from 'next/link';
import { notFound } from 'next/navigation';
import { exigirClinica, exigirContexto } from '@/lib/sessao';
import { pacienteService } from '@/modules/pacientes';
import { editar } from '../actions';
import { FormPaciente } from '../form-paciente';

export default async function EditarPacientePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await exigirContexto();
  exigirClinica(ctx);
  const { id } = await params;
  const paciente = await pacienteService.obter(ctx, id);
  if (!paciente) notFound();

  return (
    <main>
      <h1>Editar {paciente.nome}</h1>
      {paciente.idade !== null ? <p>Idade calculada: {paciente.idade} anos</p> : null}
      <FormPaciente action={editar} paciente={paciente} />
      <p>
        <Link href="/pacientes">Voltar</Link>
      </p>
    </main>
  );
}
