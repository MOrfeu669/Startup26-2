import { exigirClinica, exigirContexto } from '@/lib/sessao';
import { podeExecutar } from '@/modules/autenticacao';
import { procedimentoService } from '@/modules/procedimentos';
import { Formulario } from '../../formulario';
import { criar, editar, excluir } from './actions';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function ProcedimentosPage() {
  const ctx = await exigirContexto();
  exigirClinica(ctx);
  const podeCriar = podeExecutar(ctx.usuario, 'procedimento:criar');
  const podeExcluir = podeExecutar(ctx.usuario, 'procedimento:excluir');
  const procedimentos = await procedimentoService.listar(ctx);

  return (
    <main>
      <h1>Procedimentos</h1>
      <p>Tempo e valor são médias. Materiais entram com o estoque, numa fase seguinte.</p>
      {podeCriar ? (
        <Formulario action={criar}>
          <label>
            Nome
            <input name="nome" required />
          </label>
          <label>
            Tempo médio (minutos)
            <input name="tempo_medio_minutos" type="number" min={1} required />
          </label>
          <label>
            Valor médio (R$)
            <input name="valor_medio" type="number" min={0} step="0.01" required />
          </label>
          <button type="submit">Criar procedimento</button>
        </Formulario>
      ) : null}
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Tempo médio</th>
            <th>Valor médio</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {procedimentos.map((procedimento) => (
            <tr key={procedimento.id}>
              <td>
                {podeCriar ? (
                  <Formulario action={editar}>
                    <input type="hidden" name="id" value={procedimento.id} />
                    <input name="nome" defaultValue={procedimento.nome} aria-label="Nome" required />
                    <input
                      name="tempo_medio_minutos"
                      type="number"
                      min={1}
                      defaultValue={procedimento.tempo_medio_minutos}
                      aria-label="Tempo médio em minutos"
                      required
                    />
                    <input
                      name="valor_medio"
                      type="number"
                      min={0}
                      step="0.01"
                      defaultValue={procedimento.valor_medio}
                      aria-label="Valor médio"
                      required
                    />
                    <button type="submit">Salvar</button>
                  </Formulario>
                ) : (
                  procedimento.nome
                )}
              </td>
              <td>{podeCriar ? null : `${procedimento.tempo_medio_minutos} min`}</td>
              <td>{podeCriar ? null : moeda.format(procedimento.valor_medio)}</td>
              <td>
                {podeExcluir ? (
                  <form action={excluir}>
                    <input type="hidden" name="id" value={procedimento.id} />
                    <button type="submit">Excluir</button>
                  </form>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
