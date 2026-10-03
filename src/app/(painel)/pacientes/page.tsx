import Link from 'next/link';
import { formatarCpf } from '@/lib/cpf';
import { exigirClinica, exigirContexto } from '@/lib/sessao';
import { pacienteService } from '@/modules/pacientes';
import { cadastrar } from './actions';
import { FormPaciente } from './form-paciente';

export default async function PacientesPage({ searchParams }: { searchParams: Promise<{ busca?: string }> }) {
  const ctx = await exigirContexto();
  exigirClinica(ctx);
  const { busca } = await searchParams;
  const pacientes = await pacienteService.listar(ctx, busca ? { busca } : {});

  return (
    <main>
      <h1>Pacientes</h1>
      <form method="get">
        <label>
          Buscar por nome
          <input name="busca" defaultValue={busca} />
        </label>
        <button type="submit">Buscar</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Idade</th>
            <th>CPF</th>
            <th>Canal preferido</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pacientes.map((paciente) => {
            const preferido = paciente.canais_comunicacao.find((canal) => canal.preferido);
            return (
              <tr key={paciente.id}>
                <td>{paciente.nome}</td>
                <td>{paciente.idade ?? '—'}</td>
                <td>{paciente.cpf ? formatarCpf(paciente.cpf) : '—'}</td>
                <td>{preferido ? `${preferido.canal}: ${preferido.contato}` : '—'}</td>
                <td>
                  <Link href={`/pacientes/${paciente.id}`}>Editar</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <h2>Cadastrar</h2>
      <FormPaciente action={cadastrar} />
    </main>
  );
}
