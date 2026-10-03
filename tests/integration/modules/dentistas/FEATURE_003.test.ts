import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { ErroInfra, ErroPermissao } from '@/lib/erros';
import { criarClienteAdmin } from '@/lib/supabase/admin';
import { criarClienteAnon } from '@/lib/supabase/anon';
import { authService, carregarUsuario } from '@/modules/autenticacao';
import { dentistaService } from '@/modules/dentistas';
import { itComBanco, usarBancoLimpo } from '@tests/support/banco';
import { criarClinicaComAdmin } from '@tests/fixtures/clinica';
import { criarDentistaDeTeste } from '@tests/fixtures/dentistas';
import { contextoDe, criarUsuarioDeTeste } from '@tests/fixtures/usuarios';

const DRA_ANA = {
  nome: 'Dra. Ana Souza',
  cro: 'CRO-RS 12345',
  telefone: '(54) 99999-0000',
  cpf: '000.000.000-00',
  email_login: 'dra.ana@clinica.com',
  senha: 'senha-da-ana',
};

/** Cliente cujo insert em `dentistas` falha, para exercitar a compensação do cadastro. */
function comInsertDeDentistaFalhando(db: SupabaseClient): SupabaseClient {
  const falha = { data: null, error: { message: 'falha simulada', code: 'XX000' } };
  return new Proxy(db, {
    get(alvo, prop, receptor) {
      if (prop !== 'from') return Reflect.get(alvo, prop, receptor);
      return (tabela: string) =>
        tabela === 'dentistas'
          ? { insert: () => ({ select: () => ({ single: async () => falha }) }) }
          : alvo.from(tabela);
    },
  });
}

describe('FEATURE_003 — Cadastro de Dentistas', () => {
  usarBancoLimpo();

  itComBanco('Cenário 1: Cadastrar novo dentista', async () => {
    const db = criarClienteAdmin();
    const { clinicaId, ctxAdmin } = await criarClinicaComAdmin(db);

    const dentista = await dentistaService.cadastrar(ctxAdmin, DRA_ANA);

    expect(dentista).toMatchObject({
      clinica_id: clinicaId,
      nome: 'Dra. Ana Souza',
      cro: 'CRO-RS 12345',
      telefone: '(54) 99999-0000',
      cpf: '00000000000',
      especialidades: [],
      ativo: true,
    });
    const usuario = await carregarUsuario(db, dentista.usuario_id);
    expect(usuario).toMatchObject({ papel: 'dentista', clinica_id: clinicaId, email: DRA_ANA.email_login, ativo: true });

    const { usuario: logado } = await authService.login(
      { email: DRA_ANA.email_login, senha: DRA_ANA.senha },
      { auth: criarClienteAnon(), db },
    );
    expect(logado.id).toBe(dentista.usuario_id);
  });

  itComBanco('Cenário 2: Dentista cadastrado aparece na agenda', async () => {
    const db = criarClienteAdmin();
    const { clinicaId, ctxAdmin } = await criarClinicaComAdmin(db);
    const { dentista } = await criarDentistaDeTeste(ctxAdmin, { nome: 'Dra. Ana Souza' });
    const { usuario: recepcionista } = await criarUsuarioDeTeste(db, { papel: 'recepcionista', clinica_id: clinicaId });
    const usuarioDentista = (await carregarUsuario(db, dentista.usuario_id))!;

    for (const ctx of [ctxAdmin, contextoDe(db, usuarioDentista), contextoDe(db, recepcionista)]) {
      const disponiveis = await dentistaService.listar(ctx, { apenasAtivos: true });
      expect(disponiveis.map((d) => d.id), ctx.usuario.papel).toEqual([dentista.id]);
      expect(await dentistaService.obter(ctx, dentista.id)).toEqual(dentista);
    }
  });
  it.todo('Cenário 2 (integração): dentista selecionável ao criar o agendamento real — Feature 006');

  itComBanco('Cenário 3: Cadastro sem limite de dentistas', async () => {
    const { ctxAdmin } = await criarClinicaComAdmin(criarClienteAdmin());
    for (let i = 1; i <= 15; i++) await criarDentistaDeTeste(ctxAdmin);
    expect(await dentistaService.listar(ctxAdmin)).toHaveLength(15);

    const decimoSexto = await criarDentistaDeTeste(ctxAdmin, { nome: 'Dr. Décimo Sexto' });

    expect(decimoSexto.dentista.ativo).toBe(true);
    const ativos = await dentistaService.listar(ctxAdmin, { apenasAtivos: true });
    expect(ativos).toHaveLength(16);
    expect(ativos.map((d) => d.id)).toContain(decimoSexto.dentista.id);
  });

  itComBanco('Cenário 4: Editar dados de um dentista', async () => {
    const db = criarClienteAdmin();
    const { ctxAdmin } = await criarClinicaComAdmin(db);
    const { dentista, email, senha } = await criarDentistaDeTeste(ctxAdmin);

    const editado = await dentistaService.editar(ctxAdmin, dentista.id, { telefone: '(54) 98888-1111' });

    expect(editado).toEqual({ ...dentista, telefone: '(54) 98888-1111' });
    // Mesmo registro e mesmo login: o que estiver vinculado ao id do dentista continua vinculado.
    expect(await dentistaService.obter(ctxAdmin, dentista.id)).toEqual(editado);
    const { usuario } = await authService.login({ email, senha }, { auth: criarClienteAnon(), db });
    expect(usuario.id).toBe(dentista.usuario_id);
  });
  it.todo('Cenário 4 (integração): agendamentos do dentista continuam vinculados após a edição — Feature 006');

  itComBanco('Cenário 5: Cadastrar dentista com especialidade (informativa)', async () => {
    const { ctxAdmin } = await criarClinicaComAdmin(criarClienteAdmin());

    const { dentista } = await criarDentistaDeTeste(ctxAdmin, { especialidades: ['Endodontia'] });

    expect(dentista.especialidades).toEqual(['Endodontia']);
    expect((await dentistaService.obter(ctxAdmin, dentista.id))?.especialidades).toEqual(['Endodontia']);
    // A especialidade não filtra a seleção: ele aparece como qualquer outro dentista ativo.
    const { dentista: semEspecialidade } = await criarDentistaDeTeste(ctxAdmin);
    const ativos = await dentistaService.listar(ctxAdmin, { apenasAtivos: true });
    expect(ativos.map((d) => d.id).sort()).toEqual([dentista.id, semEspecialidade.id].sort());

    const editado = await dentistaService.editar(ctxAdmin, dentista.id, { especialidades: ['Endodontia', 'Implantodontia'] });
    expect(editado.especialidades).toEqual(['Endodontia', 'Implantodontia']);
  });
  it.todo('Cenário 5 (integração): dentista com especialidade aceita agendamento de qualquer procedimento — Feature 006');

  itComBanco('Cenário 6: Admin remove um dentista com agendamentos futuros', async () => {
    const db = criarClienteAdmin();
    const { clinicaId, ctxAdmin } = await criarClinicaComAdmin(db);
    const { dentista, email, senha } = await criarDentistaDeTeste(ctxAdmin);
    const { dentista: outro } = await criarDentistaDeTeste(ctxAdmin);

    const removido = await dentistaService.remover(ctxAdmin, dentista.id);

    expect(removido).toEqual({ ...dentista, ativo: false });
    // Sai da seleção para novos agendamentos, mas o registro continua no banco.
    const ativos = await dentistaService.listar(ctxAdmin, { apenasAtivos: true });
    expect(ativos.map((d) => d.id)).toEqual([outro.id]);
    expect((await dentistaService.listar(ctxAdmin)).map((d) => d.id)).toContain(dentista.id);
    expect(await dentistaService.obter(ctxAdmin, dentista.id)).toEqual(removido);
    // Perde o login, mantendo o usuário vinculado à clínica.
    expect(await carregarUsuario(db, dentista.usuario_id)).toMatchObject({ ativo: false, clinica_id: clinicaId });
    await expect(authService.login({ email, senha }, { auth: criarClienteAnon(), db })).rejects.toThrow(
      'Credenciais inválidas',
    );
  });
  it.todo('Cenário 6 (integração): alerta nos agendamentos futuros "agendado" do dentista removido — Feature 006');
  it.todo('Cenário 6 (integração): bloqueio de novo agendamento com o dentista removido — Feature 006 (Cenário 11)');
  it.todo('Cenário 6 (integração): destaque visual na Agenda (cor ou "!") — Feature 007');

  describe('regras de negócio', () => {
    itComBanco('Dentista e Recepcionista não cadastram, editam nem removem dentistas', async () => {
      const db = criarClienteAdmin();
      const { clinicaId, ctxAdmin } = await criarClinicaComAdmin(db);
      const { dentista } = await criarDentistaDeTeste(ctxAdmin);
      const usuarioDentista = (await carregarUsuario(db, dentista.usuario_id))!;
      const { usuario: recepcionista } = await criarUsuarioDeTeste(db, { papel: 'recepcionista', clinica_id: clinicaId });

      for (const ctx of [contextoDe(db, usuarioDentista), contextoDe(db, recepcionista)]) {
        await expect(dentistaService.cadastrar(ctx, { ...DRA_ANA, email_login: 'outra@clinica.com' })).rejects.toThrow(
          ErroPermissao,
        );
        await expect(dentistaService.editar(ctx, dentista.id, { telefone: '0' })).rejects.toThrow(ErroPermissao);
        await expect(dentistaService.remover(ctx, dentista.id)).rejects.toThrow(ErroPermissao);
      }
      expect(await dentistaService.listar(ctxAdmin)).toEqual([dentista]);
    });

    itComBanco('Admin não vê, edita nem remove dentistas de outra clínica', async () => {
      const db = criarClienteAdmin();
      const a = await criarClinicaComAdmin(db, { nome: 'Clínica A' });
      const b = await criarClinicaComAdmin(db, { nome: 'Clínica B' });
      const { dentista: deB } = await criarDentistaDeTeste(b.ctxAdmin);

      expect(await dentistaService.obter(a.ctxAdmin, deB.id)).toBeNull();
      expect(await dentistaService.listar(a.ctxAdmin)).toEqual([]);
      await expect(dentistaService.editar(a.ctxAdmin, deB.id, { nome: 'Invadido' })).rejects.toThrow(
        'Dentista não encontrado',
      );
      await expect(dentistaService.remover(a.ctxAdmin, deB.id)).rejects.toThrow('Dentista não encontrado');
      expect(await dentistaService.obter(b.ctxAdmin, deB.id)).toEqual(deB);
      expect((await carregarUsuario(db, deB.usuario_id))?.ativo).toBe(true);
    });

    itComBanco('email de login já usado não cria dentista', async () => {
      const { ctxAdmin } = await criarClinicaComAdmin(criarClienteAdmin());
      await dentistaService.cadastrar(ctxAdmin, DRA_ANA);

      await expect(dentistaService.cadastrar(ctxAdmin, { ...DRA_ANA, nome: 'Outra Ana' })).rejects.toThrow(
        'Já existe um usuário com este email',
      );
      expect(await dentistaService.listar(ctxAdmin)).toHaveLength(1);
    });

    itComBanco('se o registro do dentista falhar, o usuário recém-criado é desfeito', async () => {
      const db = criarClienteAdmin();
      const { admin } = await criarClinicaComAdmin(db);

      await expect(
        dentistaService.cadastrar(contextoDe(comInsertDeDentistaFalhando(db), admin), DRA_ANA),
      ).rejects.toThrow(ErroInfra);

      const { data: linhas } = await db.from('usuarios').select('id').eq('email', DRA_ANA.email_login);
      expect(linhas).toEqual([]);
      await expect(
        authService.login({ email: DRA_ANA.email_login, senha: DRA_ANA.senha }, { auth: criarClienteAnon(), db }),
      ).rejects.toThrow('Credenciais inválidas');
      // O email fica livre para um novo cadastro.
      const dentista = await dentistaService.cadastrar(contextoDe(db, admin), DRA_ANA);
      expect(dentista.ativo).toBe(true);
    });

    itComBanco('listagem em ordem alfabética, com ativos e removidos', async () => {
      const { ctxAdmin } = await criarClinicaComAdmin(criarClienteAdmin());
      const { dentista: carlos } = await criarDentistaDeTeste(ctxAdmin, { nome: 'Dr. Carlos' });
      await criarDentistaDeTeste(ctxAdmin, { nome: 'Dra. Ana' });
      await criarDentistaDeTeste(ctxAdmin, { nome: 'Dr. Bruno' });
      await dentistaService.remover(ctxAdmin, carlos.id);

      expect((await dentistaService.listar(ctxAdmin)).map((d) => d.nome)).toEqual(['Dr. Bruno', 'Dr. Carlos', 'Dra. Ana']);
      expect((await dentistaService.listar(ctxAdmin, { apenasAtivos: true })).map((d) => d.nome)).toEqual([
        'Dr. Bruno',
        'Dra. Ana',
      ]);
    });

    it.todo('⚠️ PENDENTE: dentista tem foto de perfil?');
  });
});
