import { describe, expect, it } from 'vitest';
import { ErroNegocio, ErroPermissao } from '@/lib/erros';
import { criarClienteAdmin } from '@/lib/supabase/admin';
import { carregarUsuario } from '@/modules/autenticacao';
import { agendamentoService } from '@/modules/agendamento';
import { clinicaService } from '@/modules/clinica';
import { dentistaService } from '@/modules/dentistas';
import { procedimentoService } from '@/modules/procedimentos';
import { executarSql, itComBanco, usarBancoLimpo } from '@tests/support/banco';
import { DOMINGO, dadosAgendamento, hora, prepararAgenda } from '@tests/fixtures/agendamentos';
import { criarClinicaComAdmin } from '@tests/fixtures/clinica';
import { criarDentistaDeTeste } from '@tests/fixtures/dentistas';
import { criarPacienteDeTeste } from '@tests/fixtures/pacientes';
import { criarProcedimentoDeTeste } from '@tests/fixtures/procedimentos';
import { contextoDe, criarUsuarioDeTeste } from '@tests/fixtures/usuarios';

const mesmoInstante = (gravado: string, informado: string) =>
  new Date(gravado).getTime() === new Date(informado).getTime();

describe('FEATURE_006 — Criar Agendamento', () => {
  usarBancoLimpo();

  itComBanco('Cenário 1: Agendar com sucesso', async () => {
    const db = criarClienteAdmin();
    const { clinicaId, ctxAdmin } = await criarClinicaComAdmin(db);
    const agenda = await prepararAgenda(ctxAdmin);
    const { usuario: recepcionista } = await criarUsuarioDeTeste(db, { papel: 'recepcionista', clinica_id: clinicaId });
    const usuarioDentista = (await carregarUsuario(db, agenda.dentista.usuario_id))!;
    const faixas = [
      ['09:00', '09:30'],
      ['10:00', '10:30'],
      ['11:00', '11:30'],
    ] as const;

    const criados = [];
    for (const [indice, ctx] of [ctxAdmin, contextoDe(db, usuarioDentista), contextoDe(db, recepcionista)].entries()) {
      const [inicio, fim] = faixas[indice]!;
      criados.push(
        await agendamentoService.criar(
          ctx,
          dadosAgendamento(agenda, { data_hora_inicio: hora(inicio), data_hora_fim: hora(fim) }),
        ),
      );
    }

    for (const agendamento of criados) {
      expect(agendamento.status).toBe('agendado');
      expect(agendamento.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(agendamento.emergencia).toBe(false);
      expect(agendamento.alertas).toEqual([]);
    }
    expect(await agendamentoService.listar(ctxAdmin)).toHaveLength(3);
  });

  itComBanco('Cenário 2: Cadeira já ocupada no horário', async () => {
    const { ctxAdmin } = await criarClinicaComAdmin(criarClienteAdmin());
    const agenda = await prepararAgenda(ctxAdmin, 'Dr. Carlos');
    const { dentista: outro } = await criarDentistaDeTeste(ctxAdmin, { nome: 'Dra. Ana' });
    const outroPaciente = await criarPacienteDeTeste(ctxAdmin, { nome: 'Maria' });
    await agendamentoService.criar(ctxAdmin, dadosAgendamento(agenda));

    await expect(
      agendamentoService.criar(
        ctxAdmin,
        dadosAgendamento(agenda, { dentista_id: outro.id, paciente_id: outroPaciente.id }),
      ),
    ).rejects.toThrow('Cadeira indisponível nesse horário');
  });

  itComBanco('Cenário 3: Dentista com bloqueio de agenda', async () => {
    const db = criarClienteAdmin();
    const { ctxAdmin } = await criarClinicaComAdmin(db);
    const agenda = await prepararAgenda(ctxAdmin);
    const usuarioDentista = (await carregarUsuario(db, agenda.dentista.usuario_id))!;

    const bloqueio = await agendamentoService.criarBloqueio(contextoDe(db, usuarioDentista), {
      dentista_id: agenda.dentista.id,
      inicio: hora('14:00'),
      fim: hora('15:00'),
      motivo: 'Congresso',
    });

    expect(bloqueio.criado_por).toBe(usuarioDentista.id);
    await expect(agendamentoService.criar(ctxAdmin, dadosAgendamento(agenda))).rejects.toThrow(
      'Dentista indisponível nesse horário',
    );
    const depois = await agendamentoService.criar(
      ctxAdmin,
      dadosAgendamento(agenda, { data_hora_inicio: hora('15:00'), data_hora_fim: hora('15:30') }),
    );
    expect(depois.status).toBe('agendado');
  });

  itComBanco('Cenário 4: Duração ajustada manualmente', async () => {
    const { ctxAdmin } = await criarClinicaComAdmin(criarClienteAdmin());
    const procedimento = await criarProcedimentoDeTeste(ctxAdmin, { nome: 'Limpeza', tempo_medio_minutos: 30 });
    const agenda = await prepararAgenda(ctxAdmin);

    const agendamento = await agendamentoService.criar(ctxAdmin, {
      ...dadosAgendamento(agenda),
      procedimento_id: procedimento.id,
      data_hora_fim: hora('14:45'),
    });

    expect(mesmoInstante(agendamento.data_hora_fim, hora('14:45'))).toBe(true);
    expect((await procedimentoService.obter(ctxAdmin, procedimento.id))?.tempo_medio_minutos).toBe(30);
  });

  itComBanco('Cenário 5: Fora do horário de funcionamento da clínica', async () => {
    const { ctxAdmin } = await criarClinicaComAdmin(criarClienteAdmin());
    const agenda = await prepararAgenda(ctxAdmin);

    await expect(
      agendamentoService.criar(
        ctxAdmin,
        dadosAgendamento(agenda, { data_hora_inicio: hora('19:00'), data_hora_fim: hora('19:30') }),
      ),
    ).rejects.toThrow('Fora do horário de funcionamento');
  });

  itComBanco('Cenário 6: Duas solicitações simultâneas para a mesma cadeira/horário', async () => {
    const db = criarClienteAdmin();
    const { clinicaId, ctxAdmin } = await criarClinicaComAdmin(db);
    const agenda = await prepararAgenda(ctxAdmin);
    const { dentista: outroDentista } = await criarDentistaDeTeste(ctxAdmin);
    const outroPaciente = await criarPacienteDeTeste(ctxAdmin, { nome: 'Maria' });
    const { usuario: recepcionista } = await criarUsuarioDeTeste(db, { papel: 'recepcionista', clinica_id: clinicaId });

    const resultados = await Promise.allSettled([
      agendamentoService.criar(ctxAdmin, dadosAgendamento(agenda)),
      agendamentoService.criar(
        contextoDe(db, recepcionista),
        dadosAgendamento(agenda, { dentista_id: outroDentista.id, paciente_id: outroPaciente.id }),
      ),
    ]);

    const confirmados = resultados.filter((resultado) => resultado.status === 'fulfilled');
    const recusados = resultados.filter((resultado) => resultado.status === 'rejected');
    expect(confirmados).toHaveLength(1);
    expect(recusados).toHaveLength(1);
    expect((recusados[0] as PromiseRejectedResult).reason).toBeInstanceOf(ErroNegocio);
    expect((recusados[0] as PromiseRejectedResult).reason.message).toBe('Cadeira indisponível nesse horário');
  });

  itComBanco('Cenário 7: Paciente já agendado no mesmo horário', async () => {
    const { ctxAdmin } = await criarClinicaComAdmin(criarClienteAdmin());
    const agenda = await prepararAgenda(ctxAdmin);
    const { dentista: outro } = await criarDentistaDeTeste(ctxAdmin);
    const cadeira2 = agenda.cadeiras.find((cadeira) => cadeira.identificacao === 'Cadeira 2')!;
    await agendamentoService.criar(ctxAdmin, dadosAgendamento(agenda));

    await expect(
      agendamentoService.criar(ctxAdmin, dadosAgendamento(agenda, { dentista_id: outro.id, cadeira_id: cadeira2.id })),
    ).rejects.toThrow('Paciente já possui agendamento nesse horário');
  });

  itComBanco('Cenário 8: Agendar sem procedimento vinculado', async () => {
    const { ctxAdmin } = await criarClinicaComAdmin(criarClienteAdmin());
    const agenda = await prepararAgenda(ctxAdmin);

    const agendamento = await agendamentoService.criar(ctxAdmin, dadosAgendamento(agenda));

    expect(agendamento.procedimento_id).toBeUndefined();
    expect(agendamento.status).toBe('agendado');
  });

  itComBanco('Cenário 8b: Registrar atendimento de emergência já ocorrido', async () => {
    const { ctxAdmin, cadeiras } = await criarClinicaComAdmin(criarClienteAdmin());
    const agenda = await prepararAgenda(ctxAdmin);
    const cadeira2 = cadeiras.find((cadeira) => cadeira.identificacao === 'Cadeira 2')!;
    await clinicaService.desativarCadeira(ctxAdmin, cadeira2.id);
    await dentistaService.remover(ctxAdmin, agenda.dentista.id);
    await agendamentoService.criar(ctxAdmin, dadosAgendamento(agenda));

    const emergencia = await agendamentoService.criar(ctxAdmin, {
      ...dadosAgendamento(agenda, { cadeira_id: cadeira2.id, data_hora_inicio: hora('10:00', DOMINGO), data_hora_fim: hora('10:30', DOMINGO) }),
      emergencia: true,
    });

    expect(emergencia).toMatchObject({ status: 'agendado', emergencia: true, cadeira_id: cadeira2.id });
    expect(await agendamentoService.obter(ctxAdmin, emergencia.id)).toMatchObject({ id: emergencia.id });
  });

  it.todo('Cenário 9: Concluir agendamento — Feature 010');

  itComBanco('Cenário 10: Cadeira desativada não aceita novos agendamentos', async () => {
    const { ctxAdmin, cadeiras } = await criarClinicaComAdmin(criarClienteAdmin());
    const cadeira2 = cadeiras.find((cadeira) => cadeira.identificacao === 'Cadeira 2')!;
    await clinicaService.desativarCadeira(ctxAdmin, cadeira2.id);
    const agenda = await prepararAgenda(ctxAdmin);

    await expect(
      agendamentoService.criar(ctxAdmin, dadosAgendamento(agenda, { cadeira_id: cadeira2.id })),
    ).rejects.toMatchObject({ message: 'Cadeira indisponível' });
  });

  itComBanco('Cenário 11: Dentista inativo não aceita novos agendamentos', async () => {
    const { ctxAdmin } = await criarClinicaComAdmin(criarClienteAdmin());
    const agenda = await prepararAgenda(ctxAdmin, 'Dr. Carlos');
    await dentistaService.remover(ctxAdmin, agenda.dentista.id);

    await expect(agendamentoService.criar(ctxAdmin, dadosAgendamento(agenda))).rejects.toMatchObject({
      message: 'Dentista indisponível',
    });
  });

  itComBanco('Cenário 12: Dia sem atendimento', async () => {
    const { ctxAdmin } = await criarClinicaComAdmin(criarClienteAdmin());
    const agenda = await prepararAgenda(ctxAdmin);

    await expect(
      agendamentoService.criar(
        ctxAdmin,
        dadosAgendamento(agenda, { data_hora_inicio: hora('14:00', DOMINGO), data_hora_fim: hora('14:30', DOMINGO) }),
      ),
    ).rejects.toThrow('Clínica não atende nesse dia');
  });

  it.todo('Cenário 13: Bloqueio de agenda recorrente — formato da recorrência ⚠️ PENDENTE');

  itComBanco('Cenário 14: Iniciar atendimento', async () => {
    const db = criarClienteAdmin();
    const { clinicaId, ctxAdmin } = await criarClinicaComAdmin(db);
    const agenda = await prepararAgenda(ctxAdmin);
    const { dentista: outro } = await criarDentistaDeTeste(ctxAdmin);
    const usuarioResponsavel = (await carregarUsuario(db, agenda.dentista.usuario_id))!;
    const usuarioOutro = (await carregarUsuario(db, outro.usuario_id))!;
    const { usuario: recepcionista } = await criarUsuarioDeTeste(db, { papel: 'recepcionista', clinica_id: clinicaId });
    const agendado = await agendamentoService.criar(ctxAdmin, dadosAgendamento(agenda));
    const emEspera = await agendamentoService.criar(
      ctxAdmin,
      dadosAgendamento(agenda, { data_hora_inicio: hora('15:00'), data_hora_fim: hora('15:30') }),
    );
    await executarSql("update agendamentos set status = 'em_espera' where id = $1", [emEspera.id]);

    await expect(agendamentoService.iniciar(contextoDe(db, recepcionista), agendado.id)).rejects.toThrow(
      'Ação não permitida para seu papel',
    );
    await expect(agendamentoService.iniciar(contextoDe(db, usuarioOutro), agendado.id)).rejects.toThrow(
      'Apenas o dentista responsável ou o Admin pode iniciar o atendimento',
    );

    const iniciado = await agendamentoService.iniciar(contextoDe(db, usuarioResponsavel), agendado.id);
    expect(iniciado).toMatchObject({ status: 'iniciado', iniciado_por: usuarioResponsavel.id });

    const iniciadoPeloAdmin = await agendamentoService.iniciar(ctxAdmin, emEspera.id);
    expect(iniciadoPeloAdmin).toMatchObject({ status: 'iniciado', iniciado_por: ctxAdmin.usuario.id });
  });

  describe('regras de negócio', () => {
    itComBanco('Admin cria bloqueio para qualquer dentista; outro dentista e a recepção não', async () => {
      const db = criarClienteAdmin();
      const { clinicaId, ctxAdmin } = await criarClinicaComAdmin(db);
      const agenda = await prepararAgenda(ctxAdmin);
      const { dentista: outro } = await criarDentistaDeTeste(ctxAdmin);
      const usuarioOutro = (await carregarUsuario(db, outro.usuario_id))!;
      const { usuario: recepcionista } = await criarUsuarioDeTeste(db, { papel: 'recepcionista', clinica_id: clinicaId });
      const bloqueio = {
        dentista_id: agenda.dentista.id,
        inicio: hora('16:00'),
        fim: hora('17:00'),
      };

      await expect(agendamentoService.criarBloqueio(contextoDe(db, recepcionista), bloqueio)).rejects.toThrow(
        ErroPermissao,
      );
      await expect(agendamentoService.criarBloqueio(contextoDe(db, usuarioOutro), bloqueio)).rejects.toThrow(
        ErroPermissao,
      );
      expect((await agendamentoService.criarBloqueio(ctxAdmin, bloqueio)).dentista_id).toBe(agenda.dentista.id);
    });

    it.todo('⚠️ PENDENTE: existe antecedência máxima para agendar?');
    it.todo('⚠️ PENDENTE: quem pode registrar emergência retroativa — todos os papéis, ou só Dentista/Admin?');
    it.todo('⚠️ PENDENTE: um agendamento pode combinar procedimento avulso e itens do plano, ou é um ou outro?');
  });
});
