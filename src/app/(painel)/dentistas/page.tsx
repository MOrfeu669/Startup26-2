import { formatarCpf } from '@/lib/cpf';
import { exigirClinica, exigirContexto } from '@/lib/sessao';
import { podeExecutar } from '@/modules/autenticacao';
import { dentistaService } from '@/modules/dentistas';
import { Formulario } from '../../formulario';
import { cadastrar, editar, remover } from './actions';

export default async function DentistasPage() {
  const ctx = await exigirContexto();
  exigirClinica(ctx);
  const podeGerir = podeExecutar(ctx.usuario, 'dentista:cadastrar');
  const dentistas = await dentistaService.listar(ctx);

  return (
    <main>
      <h1>Dentistas</h1>
      {podeGerir ? (
        <>
          <h2>Cadastrar</h2>
          <Formulario action={cadastrar}>
            <label>
              Nome
              <input name="nome" required />
            </label>
            <label>
              CRO
              <input name="cro" required />
            </label>
            <label>
              Telefone
              <input name="telefone" required />
            </label>
            <label>
              CPF
              <input name="cpf" required />
            </label>
            <label>
              Email de login
              <input name="email_login" type="email" required />
            </label>
            <label>
              Senha inicial
              <input name="senha" type="password" minLength={6} required />
            </label>
            <label>
              Especialidades (informativo, separadas por vírgula)
              <input name="especialidades" />
            </label>
            <button type="submit">Cadastrar dentista</button>
          </Formulario>
        </>
      ) : null}
      <h2>Cadastrados</h2>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>CRO</th>
            <th>Telefone</th>
            <th>CPF</th>
            <th>Especialidades</th>
            <th>Situação</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {dentistas.map((dentista) => (
            <tr key={dentista.id}>
              <td>{dentista.nome}</td>
              <td>{dentista.cro}</td>
              <td>{dentista.telefone}</td>
              <td>{formatarCpf(dentista.cpf)}</td>
              <td>{dentista.especialidades.join(', ') || '—'}</td>
              <td>{dentista.ativo ? 'Ativo' : 'Removido'}</td>
              <td>
                {podeGerir && dentista.ativo ? (
                  <>
                    <Formulario action={editar}>
                      <input type="hidden" name="id" value={dentista.id} />
                      <input name="telefone" defaultValue={dentista.telefone} aria-label="Telefone" required />
                      <input
                        name="especialidades"
                        defaultValue={dentista.especialidades.join(', ')}
                        aria-label="Especialidades"
                      />
                      <button type="submit">Salvar</button>
                    </Formulario>
                    <form action={remover}>
                      <input type="hidden" name="id" value={dentista.id} />
                      <button type="submit">Remover</button>
                    </form>
                  </>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
