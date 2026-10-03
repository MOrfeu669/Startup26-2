import { describe, expect, it } from 'vitest';
import { ErroPermissao } from '@/lib/erros';
import { criarClienteAdmin } from '@/lib/supabase/admin';
import { carregarUsuario, exigirPermissao } from '@/modules/autenticacao';
import { alertasDoAgendamento, atendeNoDia, clinicaService, dentroDoFuncionamento } from '@/modules/clinica';
import { itComBanco, usarBancoLimpo } from '@tests/support/banco';
import { criarClinicaComAdmin } from '@tests/fixtures/clinica';
import { contextoDe, criarUsuarioDeTeste } from '@tests/fixtures/usuarios';

// 2026-10-15 é quinta-feira; horários com offset de Brasília (fuso da clínica).
const AS_17_30 = '2026-10-15T17:30:00-03:00';
const AS_18_00 = '2026-10-15T18:00:00-03:00';

async function adminSemClinica() {
  const db = criarClienteAdmin();
  const { usuario } = await criarUsuarioDeTeste(db, { papel: 'admin', clinica_id: null });
  return { db, admin: usuario, ctx: contextoDe(db, usuario) };
}

describe('FEATURE_002 — Criar/Configurar Clínica', () => {
  usarBancoLimpo();

  itComBanco('Cenário 1: Criar clínica com horário padrão', async () => {
    const { db, admin, ctx } = await adminSemClinica();

    const clinica = await clinicaService.criar(ctx, {
      nome: 'Clínica OdontoSmile',
      dias_atendimento: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
      cadeiras: 3,
    });

    expect(clinica).toMatchObject({
      nome: 'Clínica OdontoSmile',
      admin_id: admin.id,
      horario_abertura: '08:00',
      horario_fechamento: '18:00',
    });
    const recarregado = await carregarUsuario(db, admin.id);
    expect(recarregado?.clinica_id).toBe(clinica.id);
    expect(await clinicaService.obter(contextoDe(db, recarregado!))).toEqual(clinica);
  });

  itComBanco('Cenário 2: Definir dias de atendimento (incluindo fim de semana)', async () => {
    const { ctx } = await adminSemClinica();

    const clinica = await clinicaService.criar(ctx, {
      nome: 'Clínica Sábado',
      dias_atendimento: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'],
      horario_abertura: '08:00',
      horario_fechamento: '18:00',
      cadeiras: 2,
    });

    expect(clinica.dias_atendimento).toEqual(['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']);
    expect(clinica).toMatchObject({ horario_abertura: '08:00', horario_fechamento: '18:00' });
    // Mesmo horário vale para o sábado; domingo não é dia de atendimento.
    const sabado = { inicio: '2026-10-17T09:00:00-03:00', fim: '2026-10-17T10:00:00-03:00' };
    expect(atendeNoDia(clinica, sabado.inicio)).toBe(true);
    expect(dentroDoFuncionamento(clinica, sabado.inicio, sabado.fim)).toBe(true);
    expect(atendeNoDia(clinica, '2026-10-18T09:00:00-03:00')).toBe(false);
  });

  itComBanco('Cenário 3: Adicionar cadeiras na criação', async () => {
    const { ctx } = await adminSemClinica();

    const clinica = await clinicaService.criar(ctx, {
      nome: 'Clínica Três Cadeiras',
      dias_atendimento: ['segunda', 'quarta', 'sexta'],
      cadeiras: 3,
    });

    expect(clinica.cadeiras.map((c) => c.identificacao)).toEqual(['Cadeira 1', 'Cadeira 2', 'Cadeira 3']);
    for (const cadeira of clinica.cadeiras) {
      // Sem restrição de procedimento: a cadeira só tem identificação e disponibilidade.
      expect(Object.keys(cadeira).sort()).toEqual(['ativa', 'clinica_id', 'id', 'identificacao']);
      expect(cadeira).toMatchObject({ clinica_id: clinica.id, ativa: true });
    }
  });

  itComBanco('Cenário 4: Adicionar cadeira depois da criação', async () => {
    const { ctxAdmin, cadeiras } = await criarClinicaComAdmin(criarClienteAdmin(), { cadeiras: 3 });
    expect(cadeiras).toHaveLength(3);

    const nova = await clinicaService.adicionarCadeira(ctxAdmin);

    expect(nova).toMatchObject({ identificacao: 'Cadeira 4', ativa: true });
    const disponiveis = await clinicaService.listarCadeiras(ctxAdmin, { apenasAtivas: true });
    expect(disponiveis.map((c) => c.identificacao)).toEqual(['Cadeira 1', 'Cadeira 2', 'Cadeira 3', 'Cadeira 4']);
  });

  itComBanco('Cenário 5: Desativar cadeira com agendamentos futuros', async () => {
    const { ctxAdmin, clinica, cadeiras } = await criarClinicaComAdmin(criarClienteAdmin(), { cadeiras: 3 });
    const cadeira2 = cadeiras.find((c) => c.identificacao === 'Cadeira 2')!;

    const desativada = await clinicaService.desativarCadeira(ctxAdmin, cadeira2.id);

    expect(desativada).toMatchObject({ id: cadeira2.id, ativa: false });
    // Não é apagada: continua na lista completa, mas sai das disponíveis para agendamento.
    const todas = await clinicaService.listarCadeiras(ctxAdmin);
    expect(todas.map((c) => c.id)).toContain(cadeira2.id);
    const ativas = await clinicaService.listarCadeiras(ctxAdmin, { apenasAtivas: true });
    expect(ativas.map((c) => c.identificacao)).toEqual(['Cadeira 1', 'Cadeira 3']);
    // Um agendamento futuro nessa cadeira passa a ter o alerta calculado.
    expect(
      alertasDoAgendamento({ clinica, cadeira: desativada, inicio: '2026-10-15T09:00:00-03:00', fim: '2026-10-15T10:00:00-03:00' }),
    ).toEqual(['cadeira_indisponivel']);
  });
  it.todo('Cenário 5 (integração): alerta no agendamento real com status "agendado" — Feature 006');
  it.todo('Cenário 5 (integração): cadeira desativada bloqueia novos agendamentos — Feature 006 (Cenário 10)');
  it.todo('Cenário 5 (integração): destaque visual na Agenda (cor ou "!") — Feature 007');

  itComBanco('Cenário 6: Alterar horário de funcionamento com agendamentos fora do novo horário', async () => {
    const { ctxAdmin, clinica, cadeiras } = await criarClinicaComAdmin(criarClienteAdmin());
    expect(dentroDoFuncionamento(clinica, AS_17_30, AS_18_00)).toBe(true);

    const atualizada = await clinicaService.atualizarHorario(ctxAdmin, {
      horario_abertura: '08:00',
      horario_fechamento: '17:00',
    });

    expect(atualizada).toMatchObject({ horario_abertura: '08:00', horario_fechamento: '17:00' });
    expect(dentroDoFuncionamento(atualizada, AS_17_30, AS_18_00)).toBe(false);
    expect(alertasDoAgendamento({ clinica: atualizada, cadeira: cadeiras[0]!, inicio: AS_17_30, fim: AS_18_00 })).toEqual([
      'fora_de_horario',
    ]);
  });
  it.todo('Cenário 6 (integração): agendamento real das 17:30 exibe "fora de horário" e NÃO é cancelado — Feature 006');
  it.todo('Cenário 6 (integração): destaque visual na Agenda — Feature 007');

  describe('regras de negócio', () => {
    itComBanco('cada Admin gerencia apenas uma clínica', async () => {
      const db = criarClienteAdmin();
      const { admin, ctxAdmin } = await criarClinicaComAdmin(db);

      await expect(
        clinicaService.criar(ctxAdmin, { nome: 'Segunda', dias_atendimento: ['segunda'], cadeiras: 1 }),
      ).rejects.toThrow('Este Admin já gerencia uma clínica');
      // Mesmo com o contexto desatualizado (sem clinica_id), o banco impede a segunda clínica.
      await expect(
        clinicaService.criar(contextoDe(db, { ...admin, clinica_id: null }), {
          nome: 'Segunda',
          dias_atendimento: ['segunda'],
          cadeiras: 1,
        }),
      ).rejects.toThrow('Este Admin já gerencia uma clínica');
    });

    itComBanco('Dentista e Recepcionista veem a clínica, mas não a configuram', async () => {
      const db = criarClienteAdmin();
      const { clinicaId, clinica } = await criarClinicaComAdmin(db);
      const { usuario: dentista } = await criarUsuarioDeTeste(db, { papel: 'dentista', clinica_id: clinicaId });
      const { usuario: recepcionista } = await criarUsuarioDeTeste(db, { papel: 'recepcionista', clinica_id: clinicaId });

      expect(await clinicaService.obter(contextoDe(db, recepcionista))).toEqual(clinica);
      await expect(clinicaService.adicionarCadeira(contextoDe(db, dentista))).rejects.toThrow(ErroPermissao);
      await expect(
        clinicaService.atualizarHorario(contextoDe(db, recepcionista), {
          horario_abertura: '07:00',
          horario_fechamento: '19:00',
        }),
      ).rejects.toThrow(ErroPermissao);
    });

    itComBanco('Admin não vê nem desativa cadeiras de outra clínica', async () => {
      const db = criarClienteAdmin();
      const a = await criarClinicaComAdmin(db, { nome: 'Clínica A' });
      const b = await criarClinicaComAdmin(db, { nome: 'Clínica B' });

      const cadeiraDeB = b.cadeiras[0]!;
      expect(await clinicaService.obterCadeira(a.ctxAdmin, cadeiraDeB.id)).toBeNull();
      await expect(clinicaService.desativarCadeira(a.ctxAdmin, cadeiraDeB.id)).rejects.toThrow('Cadeira não encontrada');
      expect((await clinicaService.listarCadeiras(a.ctxAdmin)).every((c) => c.clinica_id === a.clinicaId)).toBe(true);
      expect((await clinicaService.obterCadeira(b.ctxAdmin, cadeiraDeB.id))?.ativa).toBe(true);
    });

    itComBanco('atualiza os dias de atendimento', async () => {
      const { ctxAdmin } = await criarClinicaComAdmin(criarClienteAdmin());

      const atualizada = await clinicaService.atualizarDiasAtendimento(ctxAdmin, {
        dias_atendimento: ['sabado', 'domingo', 'segunda'],
      });

      expect(atualizada.dias_atendimento).toEqual(['domingo', 'segunda', 'sabado']);
    });

    it('só o Admin configura a clínica', () => {
      expect(() => exigirPermissao({ papel: 'dentista', ativo: true }, 'clinica:configurar')).toThrow(ErroPermissao);
      expect(() => exigirPermissao({ papel: 'recepcionista', ativo: true }, 'clinica:ver')).not.toThrow();
    });

    it.todo('⚠️ PENDENTE: feriados nacionais pré-configurados ou marcados manualmente pela clínica');
  });
});
