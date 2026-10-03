import { exigirContexto } from '@/lib/sessao';
import { DIAS_SEMANA } from '@/lib/tempo';
import { podeExecutar } from '@/modules/autenticacao';
import { clinicaService } from '@/modules/clinica';
import { Formulario } from '../../formulario';
import { criarClinica, desativar, novaCadeira, salvarDias, salvarHorario } from './actions';

const ROTULO_DIA: Record<(typeof DIAS_SEMANA)[number], string> = {
  domingo: 'Domingo',
  segunda: 'Segunda',
  terca: 'Terça',
  quarta: 'Quarta',
  quinta: 'Quinta',
  sexta: 'Sexta',
  sabado: 'Sábado',
};

export default async function ClinicaPage() {
  const ctx = await exigirContexto();
  const podeConfigurar = podeExecutar(ctx.usuario, 'clinica:configurar');

  if (!ctx.usuario.clinica_id) {
    return (
      <main>
        <h1>Criar clínica</h1>
        <Formulario action={criarClinica}>
          <label>
            Nome
            <input name="nome" required />
          </label>
          <fieldset>
            <legend>Dias de atendimento</legend>
            {DIAS_SEMANA.map((dia) => (
              <label key={dia}>
                <input type="checkbox" name="dias_atendimento" value={dia} defaultChecked={dia !== 'domingo' && dia !== 'sabado'} />
                {ROTULO_DIA[dia]}
              </label>
            ))}
          </fieldset>
          <label>
            Abertura
            <input name="horario_abertura" type="time" defaultValue="08:00" required />
          </label>
          <label>
            Fechamento
            <input name="horario_fechamento" type="time" defaultValue="18:00" required />
          </label>
          <label>
            Cadeiras
            <input name="cadeiras" type="number" min={1} defaultValue={3} required />
          </label>
          <button type="submit">Criar clínica</button>
        </Formulario>
      </main>
    );
  }

  const clinica = await clinicaService.obter(ctx);

  return (
    <main>
      <h1>{clinica.nome}</h1>
      <p>
        {clinica.horario_abertura} – {clinica.horario_fechamento}. Agendamentos fora do novo horário não são cancelados:
        passam a exibir o aviso &quot;fora de horário&quot;.
      </p>
      {podeConfigurar ? (
        <Formulario action={salvarHorario}>
          <label>
            Abertura
            <input name="horario_abertura" type="time" defaultValue={clinica.horario_abertura} required />
          </label>
          <label>
            Fechamento
            <input name="horario_fechamento" type="time" defaultValue={clinica.horario_fechamento} required />
          </label>
          <button type="submit">Salvar horário</button>
        </Formulario>
      ) : null}
      {podeConfigurar ? (
        <Formulario action={salvarDias}>
          <fieldset>
            <legend>Dias de atendimento</legend>
            {DIAS_SEMANA.map((dia) => (
              <label key={dia}>
                <input
                  type="checkbox"
                  name="dias_atendimento"
                  value={dia}
                  defaultChecked={clinica.dias_atendimento.includes(dia)}
                />
                {ROTULO_DIA[dia]}
              </label>
            ))}
          </fieldset>
          <button type="submit">Salvar dias</button>
        </Formulario>
      ) : (
        <p>Dias: {clinica.dias_atendimento.map((dia) => ROTULO_DIA[dia]).join(', ')}</p>
      )}
      <h2>Cadeiras</h2>
      {podeConfigurar ? (
        <form action={novaCadeira}>
          <button type="submit">Adicionar cadeira</button>
        </form>
      ) : null}
      <table>
        <thead>
          <tr>
            <th>Identificação</th>
            <th>Situação</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {clinica.cadeiras.map((cadeira) => (
            <tr key={cadeira.id}>
              <td>{cadeira.identificacao}</td>
              <td>{cadeira.ativa ? 'Ativa' : 'Inativa'}</td>
              <td>
                {podeConfigurar && cadeira.ativa ? (
                  <form action={desativar}>
                    <input type="hidden" name="cadeira_id" value={cadeira.id} />
                    <button type="submit">Desativar</button>
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
