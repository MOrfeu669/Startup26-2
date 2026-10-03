import { describe, expect, it } from 'vitest';
import { ErroPermissao } from '@/lib/erros';
import { authService, carregarUsuario, exigirMesmaClinica, exigirPermissao } from '@/modules/autenticacao';
import { criarClienteAdmin } from '@/lib/supabase/admin';
import { criarClienteAnon } from '@/lib/supabase/anon';
import { itComBanco, usarBancoLimpo } from '@tests/support/banco';
import { aguardarEmailPara } from '@tests/support/email';
import { criarClinicaComAdmin } from '@tests/fixtures/clinica';
import { criarUsuarioDeTeste } from '@tests/fixtures/usuarios';

describe('FEATURE_001 — Autenticação & Roles', () => {
  usarBancoLimpo();

  itComBanco('Cenário 1: Login com sucesso', async () => {
    const db = criarClienteAdmin();
    const { clinicaId } = await criarClinicaComAdmin(db);
    const { senha } = await criarUsuarioDeTeste(db, {
      papel: 'dentista',
      clinica_id: clinicaId,
      email: 'dra.ana@clinica.com',
    });

    const resultado = await authService.login(
      { email: 'dra.ana@clinica.com', senha },
      { auth: criarClienteAnon(), db },
    );

    expect(resultado.sessao.access_token).toBeTruthy();
    expect(resultado.usuario.papel).toBe('dentista');
    expect(resultado.usuario.clinica_id).toBe(clinicaId);
  });

  itComBanco('Cenário 2: Login com senha incorreta', async () => {
    const db = criarClienteAdmin();
    const { clinicaId } = await criarClinicaComAdmin(db);
    await criarUsuarioDeTeste(db, { papel: 'dentista', clinica_id: clinicaId, email: 'dra.ana@clinica.com' });
    const auth = criarClienteAnon();

    await expect(
      authService.login({ email: 'dra.ana@clinica.com', senha: 'senha-errada' }, { auth, db }),
    ).rejects.toThrow('Credenciais inválidas');

    const { data } = await auth.auth.getSession();
    expect(data.session).toBeNull();
  });

  itComBanco('Cenário 3: Admin cadastra novo usuário', async () => {
    const db = criarClienteAdmin();
    const { clinicaId, ctxAdmin } = await criarClinicaComAdmin(db);

    const novo = await authService.cadastrarUsuario(ctxAdmin, {
      nome: 'Carla Recepção',
      email: 'carla@clinica.com',
      senha: 'senha-da-carla',
      papel: 'recepcionista',
    });

    expect(novo.papel).toBe('recepcionista');
    expect(novo.clinica_id).toBe(clinicaId);

    const { usuario } = await authService.login(
      { email: 'carla@clinica.com', senha: 'senha-da-carla' },
      { auth: criarClienteAnon(), db },
    );
    expect(usuario.id).toBe(novo.id);
  });

  it('Cenário 4: Acesso negado por papel', () => {
    const recepcionista = { papel: 'recepcionista', ativo: true } as const;

    expect(() => exigirPermissao(recepcionista, 'odontograma:preencher')).toThrow(ErroPermissao);
    expect(() => exigirPermissao(recepcionista, 'odontograma:preencher')).toThrow(
      'Ação não permitida para seu papel',
    );
  });
  it.todo('Cenário 4 (integração): Recepcionista bloqueada ao preencher o Odontograma real — Feature 011');

  it('Cenário 5: Usuário de uma clínica não acessa dados de outra', () => {
    const dentistaClinicaA = { clinica_id: 'clinica-A' };

    expect(() => exigirMesmaClinica(dentistaClinicaA, 'clinica-B')).toThrow(ErroPermissao);
    expect(() => exigirMesmaClinica(dentistaClinicaA, 'clinica-A')).not.toThrow();
  });

  itComBanco('Cenário 6: Recuperação de senha', async () => {
    const db = criarClienteAdmin();
    const { clinicaId } = await criarClinicaComAdmin(db);
    const email = 'esqueci@clinica.com';
    await criarUsuarioDeTeste(db, { papel: 'dentista', clinica_id: clinicaId, email });

    await authService.solicitarRecuperacaoSenha(
      { email },
      { auth: criarClienteAnon(), redirectTo: 'http://127.0.0.1:3000/redefinir-senha' },
    );
    expect(await aguardarEmailPara(email)).toBeGreaterThan(0);

    // Simula o clique no link do email: troca o token de recuperação por uma sessão.
    const { data: link, error } = await db.auth.admin.generateLink({ type: 'recovery', email });
    expect(error).toBeNull();
    const auth = criarClienteAnon();
    const { error: erroOtp } = await auth.auth.verifyOtp({
      type: 'recovery',
      token_hash: link.properties!.hashed_token,
    });
    expect(erroOtp).toBeNull();

    await authService.redefinirSenha({ novaSenha: 'nova-senha-456' }, { auth });

    const { usuario } = await authService.login(
      { email, senha: 'nova-senha-456' },
      { auth: criarClienteAnon(), db },
    );
    expect(usuario.email).toBe(email);
  });

  itComBanco('Cenário 7: Admin remove um dentista', async () => {
    const db = criarClienteAdmin();
    const { clinicaId, ctxAdmin } = await criarClinicaComAdmin(db);
    const { usuario: dentista, senha } = await criarUsuarioDeTeste(db, {
      papel: 'dentista',
      clinica_id: clinicaId,
    });

    const removido = await authService.removerUsuario(ctxAdmin, dentista.id);

    expect(removido.ativo).toBe(false);
    expect(removido.clinica_id).toBe(clinicaId);
    const registro = await carregarUsuario(db, dentista.id);
    expect(registro).not.toBeNull();
    await expect(
      authService.login({ email: dentista.email, senha }, { auth: criarClienteAnon(), db }),
    ).rejects.toThrow('Credenciais inválidas');
  });
  it.todo('Cenário 7 (integração): agendamentos e prontuários do dentista removido permanecem — Features 006 e 010');
});
