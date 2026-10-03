import { exigirClinica, exigirContexto } from '@/lib/sessao';
import { FUSO_CLINICA } from '@/lib/tempo';
import { agendamentoService, type AlertaCalculado } from '@/modules/agendamento';
import { podeExecutar } from '@/modules/autenticacao';
import { clinicaService } from '@/modules/clinica';
import { dentistaService } from '@/modules/dentistas';
import { pacienteService } from '@/modules/pacientes';
import { procedimentoService } from '@/modules/procedimentos';
import { Formulario } from '../../formulario';
import { bloquear, iniciar } from './actions';
import { FormAgendamento } from './form-agendamento';

const ROTULO_ALERTA: Record<AlertaCalculado, string> = {
  cadeira_indisponivel: 'Cadeira indisponível',
  fora_de_horario: 'Fora de horário',
  dentista_indisponivel: 'Dentista indisponível',
};

const quando = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: FUSO_CLINICA,
});

export default async function AgendamentosPage() {
  const ctx = await exigirContexto();
  exigirClinica(ctx);
  const [pacientes, dentistas, cadeiras, procedimentos, agendamentos, bloqueios] = await Promise.all([
    pacienteService.listar(ctx),
    dentistaService.listar(ctx),
    clinicaService.listarCadeiras(ctx),
    procedimentoService.listar(ctx),
    agendamentoService.listar(ctx),
    agendamentoService.listarBloqueios(ctx),
  ]);
  const nomesPaciente = new Map(pacientes.map((paciente) => [paciente.id, paciente.nome]));
  const nomesDentista = new Map(dentistas.map((dentista) => [dentista.id, dentista.nome]));
  const nomesCadeira = new Map(cadeiras.map((cadeira) => [cadeira.id, cadeira.identificacao]));
  const podeBloquear = podeExecutar(ctx.usuario, 'bloqueio:criar');
  const podeIniciar = podeExecutar(ctx.usuario, 'agendamento:iniciar');
  const dentistaLogado = await dentistaService.obterDoUsuario(ctx);

  return (
    <main>
      <h1>Novo agendamento</h1>
      <p>A visualização em grade da agenda fica para a próxima fase. Aqui dá para marcar, iniciar e bloquear horário.</p>
      <FormAgendamento
        pacientes={pacientes.map((paciente) => ({ id: paciente.id, rotulo: paciente.nome }))}
        dentistas={dentistas.filter((dentista) => dentista.ativo).map((dentista) => ({ id: dentista.id, rotulo: dentista.nome }))}
        cadeiras={cadeiras.filter((cadeira) => cadeira.ativa).map((cadeira) => ({ id: cadeira.id, rotulo: cadeira.identificacao }))}
        procedimentos={procedimentos.map((procedimento) => ({
          id: procedimento.id,
          rotulo: `${procedimento.nome} (${procedimento.tempo_medio_minutos} min)`,
          minutos: procedimento.tempo_medio_minutos,
        }))}
      />

      <h2>Agendamentos</h2>
      <table>
        <thead>
          <tr>
            <th>Quando</th>
            <th>Paciente</th>
            <th>Dentista</th>
            <th>Cadeira</th>
            <th>Status</th>
            <th>Alertas</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {agendamentos.map((agendamento) => {
            const responsavel = dentistaLogado?.id === agendamento.dentista_id;
            const podeEste = podeIniciar && (ctx.usuario.papel === 'admin' || responsavel);
            const aberto = agendamento.status === 'agendado' || agendamento.status === 'em_espera';
            return (
              <tr key={agendamento.id}>
                <td>
                  {quando.format(new Date(agendamento.data_hora_inicio))} – {quando.format(new Date(agendamento.data_hora_fim))}
                  {agendamento.emergencia ? ' (emergência)' : ''}
                </td>
                <td>{nomesPaciente.get(agendamento.paciente_id) ?? '—'}</td>
                <td>{nomesDentista.get(agendamento.dentista_id) ?? '—'}</td>
                <td>{nomesCadeira.get(agendamento.cadeira_id) ?? '—'}</td>
                <td>{agendamento.status}</td>
                <td className={agendamento.alertas.length ? 'alerta' : undefined}>
                  {agendamento.alertas.map((alerta) => ROTULO_ALERTA[alerta]).join(', ') || '—'}
                </td>
                <td>
                  {podeEste && aberto ? (
                    <form action={iniciar}>
                      <input type="hidden" name="id" value={agendamento.id} />
                      <button type="submit">Iniciar</button>
                    </form>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {podeBloquear ? (
        <>
          <h2>Bloqueio de agenda</h2>
          <Formulario action={bloquear}>
            <label>
              Dentista
              <select name="dentista_id" required defaultValue={dentistaLogado?.id ?? ''}>
                {(ctx.usuario.papel === 'admin' ? dentistas : dentistas.filter((dentista) => dentista.id === dentistaLogado?.id)).map(
                  (dentista) => (
                    <option key={dentista.id} value={dentista.id}>
                      {dentista.nome}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              Início
              <input name="inicio" type="datetime-local" required />
            </label>
            <label>
              Término
              <input name="fim" type="datetime-local" required />
            </label>
            <label>
              Motivo
              <input name="motivo" />
            </label>
            <button type="submit">Bloquear</button>
          </Formulario>
          <ul>
            {bloqueios.map((bloqueio) => (
              <li key={bloqueio.id}>
                {nomesDentista.get(bloqueio.dentista_id) ?? 'Dentista'}: {quando.format(new Date(bloqueio.inicio))} –{' '}
                {quando.format(new Date(bloqueio.fim))}
                {bloqueio.motivo ? ` (${bloqueio.motivo})` : ''}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </main>
  );
}
