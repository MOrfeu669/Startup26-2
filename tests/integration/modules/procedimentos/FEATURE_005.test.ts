import { describe, expect, it } from 'vitest';
import { ErroPermissao } from '@/lib/erros';
import { criarClienteAdmin } from '@/lib/supabase/admin';
import { carregarUsuario } from '@/modules/autenticacao';
import { agendamentoService } from '@/modules/agendamento';
import { procedimentoService, sugerirTermino } from '@/modules/procedimentos';
import { itComBanco, usarBancoLimpo } from '@tests/support/banco';
import { dadosAgendamento, prepararAgenda } from '@tests/fixtures/agendamentos';
import { criarClinicaComAdmin } from '@tests/fixtures/clinica';
import { criarDentistaDeTeste } from '@tests/fixtures/dentistas';
import { criarProcedimentoDeTeste } from '@tests/fixtures/procedimentos';
import { contextoDe, criarUsuarioDeTeste } from '@tests/fixtures/usuarios';

describe('FEATURE_005 — Criar Procedimento', () => {
  usarBancoLimpo();

  it.todo('Cenário 1: Criar procedimento com materiais vinculados — Feature 017');

  itComBanco('Cenário 2: Criar procedimento sem materiais', async () => {
    const { ctxAdmin } = await criarClinicaComAdmin(criarClienteAdmin());

    const procedimento = await procedimentoService.criar(ctxAdmin, {
      nome: 'Avaliação/Consulta',
      tempo_medio_minutos: 30,
      valor_medio: 150,
    });

    expect(procedimento).toMatchObject({
      nome: 'Avaliação/Consulta',
      tempo_medio_minutos: 30,
      valor_medio: 150,
      materiais: [],
    });
    expect(await procedimentoService.obter(ctxAdmin, procedimento.id)).toEqual(procedimento);
  });

  itComBanco('Cenário 3: Reutilizar procedimento em agendamento', async () => {
    const db = criarClienteAdmin();
    const { ctxAdmin } = await criarClinicaComAdmin(db);
    const procedimento = await criarProcedimentoDeTeste(ctxAdmin, { nome: 'Limpeza', tempo_medio_minutos: 30 });
    const agenda = await prepararAgenda(ctxAdmin);
    const inicio = new Date('2026-10-15T14:00:00-03:00');
    const terminoSugerido = sugerirTermino(inicio, procedimento.tempo_medio_minutos);

    const agendamento = await agendamentoService.criar(ctxAdmin, {
      ...dadosAgendamento(agenda),
      procedimento_id: procedimento.id,
      data_hora_inicio: inicio.toISOString(),
      data_hora_fim: terminoSugerido.toISOString(),
    });

    expect(new Date(agendamento.data_hora_fim).getTime() - new Date(agendamento.data_hora_inicio).getTime()).toBe(
      30 * 60_000,
    );
    const ajustado = await agendamentoService.criar(ctxAdmin, {
      ...dadosAgendamento(agenda, {
        data_hora_inicio: '2026-10-15T15:00:00-03:00',
        data_hora_fim: '2026-10-15T15:45:00-03:00',
        procedimento_id: procedimento.id,
      }),
    });
    expect(new Date(ajustado.data_hora_fim).getTime() - new Date(ajustado.data_hora_inicio).getTime()).toBe(45 * 60_000);
    expect((await procedimentoService.obter(ctxAdmin, procedimento.id))?.tempo_medio_minutos).toBe(30);
  });

  it.todo('Cenário 4: Adicionar materiais a um procedimento já existente — Feature 017');

  itComBanco('Cenário 5: Apenas Admin pode excluir procedimento', async () => {
    const db = criarClienteAdmin();
    const { clinicaId, ctxAdmin } = await criarClinicaComAdmin(db);
    const procedimento = await criarProcedimentoDeTeste(ctxAdmin);
    const { dentista } = await criarDentistaDeTeste(ctxAdmin);
    const usuarioDentista = (await carregarUsuario(db, dentista.usuario_id))!;
    const { usuario: recepcionista } = await criarUsuarioDeTeste(db, { papel: 'recepcionista', clinica_id: clinicaId });

    await expect(procedimentoService.excluir(contextoDe(db, usuarioDentista), procedimento.id)).rejects.toThrow(
      ErroPermissao,
    );
    await expect(procedimentoService.criar(contextoDe(db, recepcionista), {
      nome: 'Extração',
      tempo_medio_minutos: 20,
      valor_medio: 80,
    })).rejects.toThrow(ErroPermissao);
    expect(await procedimentoService.obter(ctxAdmin, procedimento.id)).toMatchObject({ id: procedimento.id });

    await procedimentoService.excluir(ctxAdmin, procedimento.id);
    expect(await procedimentoService.obter(ctxAdmin, procedimento.id)).toBeNull();
  });

  describe('regras de negócio', () => {
    it.todo(
      '⚠️ PENDENTE: excluir um procedimento já usado em agendamentos apaga o histórico ou o procedimento fica arquivado?',
    );
    it.todo(
      '⚠️ PENDENTE: a regra [stated] "materiais são vinculados na criação" convive com a [correção] "pode ser criado sem materiais"?',
    );
  });
});
