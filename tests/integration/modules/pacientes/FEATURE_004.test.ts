import { describe, expect, it } from 'vitest';
import { ErroPermissao, ErroValidacao } from '@/lib/erros';
import { criarClienteAdmin } from '@/lib/supabase/admin';
import { carregarUsuario } from '@/modules/autenticacao';
import { agendamentoService } from '@/modules/agendamento';
import { ErroCpfDuplicado, pacienteService } from '@/modules/pacientes';
import { itComBanco, usarBancoLimpo } from '@tests/support/banco';
import { dadosAgendamento, prepararAgenda } from '@tests/fixtures/agendamentos';
import { criarClinicaComAdmin } from '@tests/fixtures/clinica';
import { criarDentistaDeTeste } from '@tests/fixtures/dentistas';
import { criarPacienteDeTeste } from '@tests/fixtures/pacientes';
import { contextoDe, criarUsuarioDeTeste } from '@tests/fixtures/usuarios';

const HOJE = new Date('2026-10-03T15:00:00Z');

const JOAO = {
  nome: 'João Pereira',
  canais_comunicacao: [
    { canal: 'whatsapp' as const, contato: '(54) 99999-0000', preferido: true },
    { canal: 'email' as const, contato: 'joao@email.com', preferido: false },
  ],
  cpf: '000.000.000-00',
  endereco: 'Rua das Flores, 123',
  data_nascimento: '1990-05-10',
  sexo: 'masculino' as const,
};

describe('FEATURE_004 — Cadastro de Pacientes', () => {
  usarBancoLimpo();

  itComBanco('Cenário 1: Cadastrar paciente com dados completos', async () => {
    const db = criarClienteAdmin();
    const { clinicaId, ctxAdmin } = await criarClinicaComAdmin(db);
    const { usuario: recepcionista } = await criarUsuarioDeTeste(db, { papel: 'recepcionista', clinica_id: clinicaId });

    const paciente = await pacienteService.cadastrar(contextoDe(db, recepcionista), JOAO, HOJE);

    expect(paciente).toMatchObject({
      clinica_id: clinicaId,
      nome: 'João Pereira',
      cpf: '00000000000',
      endereco: 'Rua das Flores, 123',
      data_nascimento: '1990-05-10',
      sexo: 'masculino',
      idade: 36,
      canais_comunicacao: [
        { canal: 'whatsapp', contato: '(54) 99999-0000', preferido: true },
        { canal: 'email', contato: 'joao@email.com', preferido: false },
      ],
    });
    expect(paciente).not.toHaveProperty('responsavel_legal');
    const { data: usuarios } = await db.from('usuarios').select('id').eq('email', 'joao@email.com');
    expect(usuarios).toEqual([]);
  });

  itComBanco('Cenário 2: Paciente cadastrado aparece disponível para agendamento', async () => {
    const db = criarClienteAdmin();
    const { clinicaId, ctxAdmin } = await criarClinicaComAdmin(db);
    const paciente = await criarPacienteDeTeste(ctxAdmin, { nome: 'João Pereira' });
    const { dentista } = await criarDentistaDeTeste(ctxAdmin);
    const usuarioDentista = (await carregarUsuario(db, dentista.usuario_id))!;
    const { usuario: recepcionista } = await criarUsuarioDeTeste(db, { papel: 'recepcionista', clinica_id: clinicaId });

    for (const ctx of [ctxAdmin, contextoDe(db, usuarioDentista), contextoDe(db, recepcionista)]) {
      const busca = await pacienteService.listar(ctx, { busca: 'joão' });
      expect(busca.map((item) => item.id), ctx.usuario.papel).toEqual([paciente.id]);
      expect(await pacienteService.obter(ctx, paciente.id)).toMatchObject({ id: paciente.id, nome: 'João Pereira' });
    }
  });
  itComBanco('Cenário 2 (integração): paciente selecionável ao criar o agendamento real — Feature 006', async () => {
    const { ctxAdmin } = await criarClinicaComAdmin(criarClienteAdmin());
    const agenda = await prepararAgenda(ctxAdmin);

    const agendamento = await agendamentoService.criar(ctxAdmin, dadosAgendamento(agenda));

    expect(agendamento.paciente_id).toBe(agenda.paciente.id);
  });

  itComBanco('Cenário 3: Editar dados do paciente', async () => {
    const db = criarClienteAdmin();
    const { ctxAdmin } = await criarClinicaComAdmin(db);
    const { dentista } = await criarDentistaDeTeste(ctxAdmin);
    const usuarioDentista = (await carregarUsuario(db, dentista.usuario_id))!;
    const paciente = await criarPacienteDeTeste(ctxAdmin);

    const editado = await pacienteService.editar(contextoDe(db, usuarioDentista), paciente.id, {
      canais_comunicacao: [{ canal: 'whatsapp', contato: '(54) 98888-1111', preferido: true }],
    });

    expect(editado.id).toBe(paciente.id);
    expect(editado.canais_comunicacao).toEqual([{ canal: 'whatsapp', contato: '(54) 98888-1111', preferido: true }]);
    expect(await pacienteService.obter(ctxAdmin, paciente.id)).toEqual(editado);
  });
  itComBanco('Cenário 3 (integração): agendamentos continuam vinculados após a edição — Feature 006', async () => {
    const { ctxAdmin } = await criarClinicaComAdmin(criarClienteAdmin());
    const agenda = await prepararAgenda(ctxAdmin);
    const agendamento = await agendamentoService.criar(ctxAdmin, dadosAgendamento(agenda));

    await pacienteService.editar(ctxAdmin, agenda.paciente.id, {
      canais_comunicacao: [{ canal: 'sms', contato: '(54) 98888-1111', preferido: true }],
    });

    expect((await agendamentoService.obter(ctxAdmin, agendamento.id))?.paciente_id).toBe(agenda.paciente.id);
  });
  it.todo('Cenário 3 (integração): prontuário continua vinculado após a edição — Feature 010');

  itComBanco('Cenário 4: Idade calculada a partir do aniversário', async () => {
    const { ctxAdmin } = await criarClinicaComAdmin(criarClienteAdmin());
    const paciente = await criarPacienteDeTeste(ctxAdmin, { data_nascimento: '1990-05-10' });

    const exibido = await pacienteService.obter(ctxAdmin, paciente.id, HOJE);

    expect(exibido?.data_nascimento).toBe('1990-05-10');
    expect(exibido?.idade).toBe(36);
    const { data } = await ctxAdmin.db.from('pacientes').select('*').eq('id', paciente.id).single();
    expect(data).not.toHaveProperty('idade');
  });

  itComBanco('Cenário 5: Bloquear cadastro com CPF duplicado', async () => {
    const { ctxAdmin } = await criarClinicaComAdmin(criarClienteAdmin());
    const existente = await criarPacienteDeTeste(ctxAdmin, { nome: 'João Pereira', cpf: '000.000.000-00' });

    const erro = await pacienteService
      .cadastrar(ctxAdmin, {
        nome: 'Outro João',
        canais_comunicacao: [{ canal: 'sms', contato: '(54) 97777-0000', preferido: true }],
        cpf: '000.000.000-00',
      })
      .catch((falha: unknown) => falha);

    expect(erro).toBeInstanceOf(ErroCpfDuplicado);
    expect((erro as ErroCpfDuplicado).pacienteExistente).toEqual({
      id: existente.id,
      nome: 'João Pereira',
      cpf: '00000000000',
    });
    expect(await pacienteService.listar(ctxAdmin)).toHaveLength(1);
  });

  itComBanco('Cenário 6: Cadastrar paciente menor de idade com responsável legal', async () => {
    const { ctxAdmin } = await criarClinicaComAdmin(criarClienteAdmin());

    const paciente = await pacienteService.cadastrar(
      ctxAdmin,
      {
        nome: 'Maria Pereira',
        canais_comunicacao: [{ canal: 'sms', contato: '(54) 98888-0000', preferido: true }],
        data_nascimento: '2015-03-20',
        sexo: 'feminino',
        responsavel_legal: { nome: 'João Pereira', cpf: '000.000.000-00' },
      },
      HOJE,
    );

    expect(paciente.idade).toBe(11);
    expect(paciente.responsavel_legal).toEqual({ nome: 'João Pereira', cpf: '00000000000' });
    expect(paciente.sexo).toBe('feminino');
  });

  itComBanco('Cenário 7: Cadastro mínimo (nome + um canal)', async () => {
    const { ctxAdmin } = await criarClinicaComAdmin(criarClienteAdmin());

    const paciente = await pacienteService.cadastrar(ctxAdmin, {
      nome: 'Ana Lima',
      canais_comunicacao: [{ canal: 'whatsapp', contato: '(54) 99999-0000' }],
    });

    expect(paciente).toMatchObject({
      nome: 'Ana Lima',
      idade: null,
      canais_comunicacao: [{ canal: 'whatsapp', contato: '(54) 99999-0000', preferido: true }],
    });
    expect(paciente.cpf).toBeUndefined();
    expect(paciente.data_nascimento).toBeUndefined();
    expect(paciente.responsavel_legal).toBeUndefined();
  });

  itComBanco('Cenário 8: Bloquear cadastro sem canal de comunicação', async () => {
    const { ctxAdmin } = await criarClinicaComAdmin(criarClienteAdmin());

    await expect(pacienteService.cadastrar(ctxAdmin, { nome: 'Sem Canal' })).rejects.toThrow(ErroValidacao);
    await expect(pacienteService.cadastrar(ctxAdmin, { nome: 'Sem Canal', canais_comunicacao: [] })).rejects.toThrow(
      'Informe pelo menos um canal de comunicação',
    );
    expect(await pacienteService.listar(ctxAdmin)).toEqual([]);
  });

  describe('regras de negócio', () => {
    itComBanco('o mesmo CPF pode existir em clínicas diferentes', async () => {
      const db = criarClienteAdmin();
      const a = await criarClinicaComAdmin(db, { nome: 'Clínica A' });
      const b = await criarClinicaComAdmin(db, { nome: 'Clínica B' });
      const deA = await criarPacienteDeTeste(a.ctxAdmin, { cpf: '000.000.000-00' });

      const deB = await criarPacienteDeTeste(b.ctxAdmin, { cpf: '000.000.000-00' });

      expect(deB.cpf).toBe(deA.cpf);
      expect(await pacienteService.obter(a.ctxAdmin, deB.id)).toBeNull();
      expect(await pacienteService.listar(a.ctxAdmin)).toHaveLength(1);
    });

    itComBanco('paciente sem data de nascimento não exige responsável; menor sem responsável é recusado', async () => {
      const { ctxAdmin } = await criarClinicaComAdmin(criarClienteAdmin());
      const semData = await criarPacienteDeTeste(ctxAdmin, { nome: 'Sem data' });
      expect(semData.responsavel_legal).toBeUndefined();

      await expect(
        pacienteService.cadastrar(
          ctxAdmin,
          {
            nome: 'Criança',
            canais_comunicacao: [{ canal: 'sms', contato: '1', preferido: true }],
            data_nascimento: '2015-03-20',
          },
          HOJE,
        ),
      ).rejects.toThrow('Responsável legal obrigatório para paciente menor de 18 anos');
    });

    it.todo(
      '⚠️ PENDENTE: responsável legal também precisa ter CPF único, ou pode repetir entre irmãos?',
    );
    it.todo(
      '⚠️ PENDENTE: exportação/importação da lista de pacientes (fase, formato, Visão Geral vs. dados clínicos, CPF já existente)',
    );
  });

  describe('permissão', () => {
    itComBanco('usuário sem clínica não cadastra paciente', async () => {
      const db = criarClienteAdmin();
      const { usuario } = await criarUsuarioDeTeste(db, { papel: 'admin', clinica_id: null });
      await expect(pacienteService.cadastrar(contextoDe(db, usuario), JOAO)).rejects.toThrow(ErroPermissao);
    });
  });
});
