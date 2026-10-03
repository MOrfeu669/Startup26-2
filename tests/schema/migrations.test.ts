import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { criarAuthUser, criarBancoComMigrations, listarMigrations } from '@tests/support/pglite';

describe('migrations aplicam sem erro em um Postgres limpo', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await criarBancoComMigrations();
  });
  afterAll(async () => {
    await db.close();
  });

  async function criarAdmin(): Promise<string> {
    const id = await criarAuthUser(db);
    await db.query("insert into usuarios (id, nome, email, papel) values ($1, 'Admin', $2, 'admin')", [
      id,
      `admin-${id}@x.com`,
    ]);
    return id;
  }

  async function criarClinica(adminId: string, cadeiras = 3): Promise<string> {
    const { rows } = await db.query<{ id: string }>(
      "select public.criar_clinica($1, 'Clínica', '{segunda,terca}', '08:00', '18:00', $2) as id",
      [adminId, cadeiras],
    );
    return rows[0]!.id;
  }

  it('existe ao menos uma migration e os nomes seguem a ordem por timestamp', () => {
    const arquivos = listarMigrations();
    expect(arquivos.length).toBeGreaterThan(0);
    for (const nome of arquivos) expect(nome).toMatch(/^\d{14}_f\d{3}_[a-z0-9_]+\.sql$/);
  });

  it('toda tabela do schema public tem RLS ativado', async () => {
    const { rows } = await db.query<{ tablename: string; rowsecurity: boolean }>(
      "select tablename, rowsecurity from pg_tables where schemaname = 'public'",
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const tabela of rows) expect(tabela, tabela.tablename).toMatchObject({ rowsecurity: true });
  });

  describe('Feature 001 — usuarios', () => {
    it('exige clinica_id para papéis diferentes de admin', async () => {
      const id = await criarAuthUser(db);
      await expect(
        db.query("insert into usuarios (id, nome, email, papel) values ($1, 'Ana', 'ana@x.com', 'dentista')", [id]),
      ).rejects.toThrow(/usuarios_clinica_obrigatoria_fora_admin/);
    });

    it('aceita admin sem clínica (antes de criar a clínica)', async () => {
      const id = await criarAuthUser(db);
      await db.query("insert into usuarios (id, nome, email, papel) values ($1, 'Dono', 'dono@x.com', 'admin')", [id]);
      const { rows } = await db.query<{ ativo: boolean }>('select ativo from usuarios where id = $1', [id]);
      expect(rows[0]?.ativo).toBe(true);
    });

    it('email é único sem diferenciar maiúsculas', async () => {
      const a = await criarAuthUser(db);
      const b = await criarAuthUser(db);
      await db.query("insert into usuarios (id, nome, email, papel) values ($1, 'A', 'Repetido@x.com', 'admin')", [a]);
      await expect(
        db.query("insert into usuarios (id, nome, email, papel) values ($1, 'B', 'repetido@x.com', 'admin')", [b]),
      ).rejects.toThrow(/usuarios_email_unico/);
    });
  });

  describe('Feature 002 — clinicas e cadeiras', () => {
    const ASSINATURA_CRIAR = 'public.criar_clinica(uuid, text, public.dia_semana[], time, time, integer)';

    it('aplica o horário padrão 08:00–18:00', async () => {
      const adminId = await criarAdmin();
      const { rows } = await db.query<{ horario_abertura: string; horario_fechamento: string }>(
        "insert into clinicas (nome, admin_id, dias_atendimento) values ('C', $1, '{segunda}') returning horario_abertura, horario_fechamento",
        [adminId],
      );
      expect(rows[0]).toEqual({ horario_abertura: '08:00:00', horario_fechamento: '18:00:00' });
    });

    it('rejeita abertura igual ou depois do fechamento', async () => {
      const adminId = await criarAdmin();
      await expect(
        db.query(
          "insert into clinicas (nome, admin_id, dias_atendimento, horario_abertura, horario_fechamento) values ('C', $1, '{segunda}', '18:00', '08:00')",
          [adminId],
        ),
      ).rejects.toThrow(/clinicas_horario_valido/);
    });

    it('exige ao menos um dia de atendimento válido', async () => {
      const adminId = await criarAdmin();
      await expect(
        db.query("insert into clinicas (nome, admin_id, dias_atendimento) values ('C', $1, '{}')", [adminId]),
      ).rejects.toThrow(/clinicas_dias_atendimento_preenchido/);
      await expect(
        db.query("insert into clinicas (nome, admin_id, dias_atendimento) values ('C', $1, '{feriado}')", [adminId]),
      ).rejects.toThrow(/dia_semana/);
    });

    it('um Admin gerencia uma única clínica (admin_id único)', async () => {
      const adminId = await criarAdmin();
      const sql = "insert into clinicas (nome, admin_id, dias_atendimento) values ('C', $1, '{segunda}')";
      await db.query(sql, [adminId]);
      await expect(db.query(sql, [adminId])).rejects.toThrow(/clinicas_admin_unico/);
    });

    it('usuarios.clinica_id precisa apontar para uma clínica existente', async () => {
      const id = await criarAuthUser(db);
      await expect(
        db.query(
          "insert into usuarios (id, nome, email, papel, clinica_id) values ($1, 'Ana', $2, 'dentista', gen_random_uuid())",
          [id, `ana-${id}@x.com`],
        ),
      ).rejects.toThrow(/usuarios_clinica_fk/);
    });

    it('identificação da cadeira é única por clínica, sem diferenciar maiúsculas', async () => {
      const clinicaA = await criarClinica(await criarAdmin(), 1);
      const clinicaB = await criarClinica(await criarAdmin(), 0);
      await expect(
        db.query("insert into cadeiras (clinica_id, identificacao) values ($1, 'cadeira 1')", [clinicaA]),
      ).rejects.toThrow(/cadeiras_identificacao_unica/);
      await db.query("insert into cadeiras (clinica_id, identificacao) values ($1, 'Cadeira 1')", [clinicaB]);
    });

    it('criar_clinica cria a clínica, as cadeiras "Cadeira 1..N" e vincula o Admin', async () => {
      const adminId = await criarAdmin();
      const clinicaId = await criarClinica(adminId, 3);

      const cadeiras = await db.query<{ identificacao: string; ativa: boolean }>(
        'select identificacao, ativa from cadeiras where clinica_id = $1 order by identificacao',
        [clinicaId],
      );
      expect(cadeiras.rows).toEqual([
        { identificacao: 'Cadeira 1', ativa: true },
        { identificacao: 'Cadeira 2', ativa: true },
        { identificacao: 'Cadeira 3', ativa: true },
      ]);
      const admin = await db.query<{ clinica_id: string }>('select clinica_id from usuarios where id = $1', [adminId]);
      expect(admin.rows[0]?.clinica_id).toBe(clinicaId);
    });

    it('criar_clinica recusa Admin que já tem clínica e usuário que não é Admin, sem efeitos parciais', async () => {
      const adminId = await criarAdmin();
      await criarClinica(adminId);
      await expect(criarClinica(adminId)).rejects.toThrow('ADMIN_JA_POSSUI_CLINICA');

      const clinica = await db.query<{ id: string }>('select id from clinicas where admin_id = $1', [adminId]);
      const dentistaId = await criarAuthUser(db);
      await db.query("insert into usuarios (id, nome, email, papel, clinica_id) values ($1, 'D', $2, 'dentista', $3)", [
        dentistaId,
        `d-${dentistaId}@x.com`,
        clinica.rows[0]!.id,
      ]);
      const antes = await db.query<{ n: number }>('select count(*)::int as n from clinicas');
      await expect(criarClinica(dentistaId)).rejects.toThrow('ADMIN_INVALIDO');
      const depois = await db.query<{ n: number }>('select count(*)::int as n from clinicas');
      expect(depois.rows[0]?.n).toBe(antes.rows[0]?.n);
    });

    it('criar_clinica só pode ser executada pelo service_role', async () => {
      const { rows } = await db.query<{ anon: boolean; authenticated: boolean; service_role: boolean }>(
        `select has_function_privilege('anon', '${ASSINATURA_CRIAR}', 'execute') as anon,
                has_function_privilege('authenticated', '${ASSINATURA_CRIAR}', 'execute') as authenticated,
                has_function_privilege('service_role', '${ASSINATURA_CRIAR}', 'execute') as service_role`,
      );
      expect(rows[0]).toEqual({ anon: false, authenticated: false, service_role: true });
    });
  });

  describe('Feature 003 — dentistas', () => {
    async function criarUsuarioDentista(clinicaId: string): Promise<string> {
      const id = await criarAuthUser(db);
      await db.query("insert into usuarios (id, nome, email, papel, clinica_id) values ($1, 'D', $2, 'dentista', $3)", [
        id,
        `d-${id}@x.com`,
        clinicaId,
      ]);
      return id;
    }

    async function inserirDentista(usuarioId: string, clinicaId: string, campos: Record<string, string> = {}) {
      const dados = { nome: 'Dra. Ana', cro: 'CRO-RS 1', telefone: '(54) 9999-0000', cpf: '12345678909', ...campos };
      const { rows } = await db.query<{ id: string; especialidades: string[]; ativo: boolean }>(
        `insert into dentistas (usuario_id, clinica_id, nome, cro, telefone, cpf)
         values ($1, $2, $3, $4, $5, $6) returning id, especialidades, ativo`,
        [usuarioId, clinicaId, dados.nome, dados.cro, dados.telefone, dados.cpf],
      );
      return rows[0]!;
    }

    it('nasce ativo e sem especialidades', async () => {
      const clinicaId = await criarClinica(await criarAdmin());
      const dentista = await inserirDentista(await criarUsuarioDentista(clinicaId), clinicaId);
      expect(dentista).toMatchObject({ especialidades: [], ativo: true });
    });

    it('CPF é gravado só com 11 dígitos', async () => {
      const clinicaId = await criarClinica(await criarAdmin());
      for (const cpf of ['123.456.789-09', '1234567890', '123456789012', '']) {
        await expect(
          inserirDentista(await criarUsuarioDentista(clinicaId), clinicaId, { cpf }),
          cpf,
        ).rejects.toThrow(/dentistas_cpf_formato/);
      }
    });

    it('exige nome, CRO e telefone preenchidos', async () => {
      const clinicaId = await criarClinica(await criarAdmin());
      for (const campo of ['nome', 'cro', 'telefone']) {
        await expect(
          inserirDentista(await criarUsuarioDentista(clinicaId), clinicaId, { [campo]: '  ' }),
          campo,
        ).rejects.toThrow(new RegExp(`dentistas_${campo}_check`));
      }
    });

    it('um usuário corresponde a no máximo um dentista', async () => {
      const clinicaId = await criarClinica(await criarAdmin());
      const usuarioId = await criarUsuarioDentista(clinicaId);
      await inserirDentista(usuarioId, clinicaId);
      await expect(inserirDentista(usuarioId, clinicaId)).rejects.toThrow(/dentistas_usuario_unico/);
    });

    it('o usuário do dentista precisa ser da mesma clínica', async () => {
      const clinicaA = await criarClinica(await criarAdmin());
      const clinicaB = await criarClinica(await criarAdmin());
      const usuarioDeA = await criarUsuarioDentista(clinicaA);
      await expect(inserirDentista(usuarioDeA, clinicaB)).rejects.toThrow(/dentistas_usuario_clinica_fk/);
      await expect(inserirDentista(await criarAuthUser(db), clinicaA)).rejects.toThrow(/dentistas_usuario_clinica_fk/);
    });

    it('usuário com dentista vinculado não pode ser apagado', async () => {
      const clinicaId = await criarClinica(await criarAdmin());
      const usuarioId = await criarUsuarioDentista(clinicaId);
      await inserirDentista(usuarioId, clinicaId);
      await expect(db.query('delete from usuarios where id = $1', [usuarioId])).rejects.toThrow(
        /dentistas_usuario_clinica_fk/,
      );
    });

    it('não há unicidade de CPF nem de CRO entre dentistas (a spec não define)', async () => {
      const clinicaId = await criarClinica(await criarAdmin());
      await inserirDentista(await criarUsuarioDentista(clinicaId), clinicaId);
      await inserirDentista(await criarUsuarioDentista(clinicaId), clinicaId);
      const { rows } = await db.query<{ n: number }>(
        "select count(*)::int as n from dentistas where clinica_id = $1 and cpf = '12345678909'",
        [clinicaId],
      );
      expect(rows[0]?.n).toBe(2);
    });

    it('rejeita especialidade nula e atualiza atualizado_em em cada alteração', async () => {
      const clinicaId = await criarClinica(await criarAdmin());
      const { id } = await inserirDentista(await criarUsuarioDentista(clinicaId), clinicaId);
      await expect(
        db.query("update dentistas set especialidades = array['Endodontia', null] where id = $1", [id]),
      ).rejects.toThrow(/dentistas_especialidades_preenchidas/);

      // O trigger sobrescreve qualquer valor informado com o instante da alteração.
      await db.query("update dentistas set telefone = '0', atualizado_em = '2000-01-01' where id = $1", [id]);
      const { rows } = await db.query<{ recente: boolean }>(
        "select atualizado_em > '2001-01-01' as recente from dentistas where id = $1",
        [id],
      );
      expect(rows[0]?.recente).toBe(true);
    });
  });

  describe('Feature 004 — pacientes', () => {
    it('CPF é único por clínica só quando informado', async () => {
      const clinicaA = await criarClinica(await criarAdmin());
      const clinicaB = await criarClinica(await criarAdmin());
      const inserir = (clinicaId: string, cpf: string | null) =>
        db.query('insert into pacientes (clinica_id, nome, cpf) values ($1, $2, $3)', [clinicaId, 'João', cpf]);

      await inserir(clinicaA, '00000000000');
      await expect(inserir(clinicaA, '00000000000')).rejects.toThrow(/pacientes_cpf_unico_por_clinica/);
      await inserir(clinicaB, '00000000000');
      await inserir(clinicaA, null);
      await inserir(clinicaA, null);
      await expect(inserir(clinicaA, '000')).rejects.toThrow(/pacientes_cpf_formato/);
    });

    it('responsável legal é completo ou ausente, e há no máximo um canal preferido', async () => {
      const clinicaId = await criarClinica(await criarAdmin());
      const { rows } = await db.query<{ id: string }>(
        "insert into pacientes (clinica_id, nome) values ($1, 'Maria') returning id",
        [clinicaId],
      );
      const pacienteId = rows[0]!.id;
      await expect(db.query("update pacientes set responsavel_nome = 'Pai' where id = $1", [pacienteId])).rejects.toThrow(
        /pacientes_responsavel_completo/,
      );
      await db.query("update pacientes set responsavel_nome = 'Pai', responsavel_cpf = '00000000000' where id = $1", [
        pacienteId,
      ]);

      const canal = (preferido: boolean) =>
        db.query(
          "insert into canais_comunicacao (paciente_id, clinica_id, canal, contato, preferido) values ($1, $2, 'sms', '1', $3)",
          [pacienteId, clinicaId, preferido],
        );
      await canal(true);
      await expect(canal(true)).rejects.toThrow(/canais_um_preferido_por_paciente/);
      await canal(false);
    });

    it('salvar_paciente só pode ser executada pelo service_role', async () => {
      const assinatura =
        'public.salvar_paciente(uuid, uuid, text, text, text, date, text, text, text, text, jsonb)';
      const { rows } = await db.query<{ anon: boolean; authenticated: boolean; service_role: boolean }>(
        `select has_function_privilege('anon', '${assinatura}', 'execute') as anon,
                has_function_privilege('authenticated', '${assinatura}', 'execute') as authenticated,
                has_function_privilege('service_role', '${assinatura}', 'execute') as service_role`,
      );
      expect(rows[0]).toEqual({ anon: false, authenticated: false, service_role: true });
    });
  });

  describe('Feature 005 — procedimentos', () => {
    it('exige nome, tempo positivo e valor não negativo', async () => {
      const clinicaId = await criarClinica(await criarAdmin());
      const inserir = (tempo: number, valor: number, nome = 'Limpeza') =>
        db.query(
          'insert into procedimentos (clinica_id, nome, tempo_medio_minutos, valor_medio) values ($1, $2, $3, $4)',
          [clinicaId, nome, tempo, valor],
        );
      await inserir(30, 0);
      await expect(inserir(0, 10)).rejects.toThrow(/procedimentos_tempo_medio_minutos_check/);
      await expect(inserir(10, -1)).rejects.toThrow(/procedimentos_valor_medio_check/);
      await expect(inserir(10, 10, '  ')).rejects.toThrow(/procedimentos_nome_check/);
    });
  });

  describe('Feature 006 — agendamentos', () => {
    async function cenario() {
      const adminId = await criarAdmin();
      const clinicaId = await criarClinica(adminId);
      const usuarioDentista = await criarAuthUser(db);
      await db.query("insert into usuarios (id, nome, email, papel, clinica_id) values ($1, 'Dr. Carlos', $2, 'dentista', $3)", [
        usuarioDentista,
        `carlos-${usuarioDentista}@x.com`,
        clinicaId,
      ]);
      const dentista = await db.query<{ id: string }>(
        "insert into dentistas (usuario_id, clinica_id, nome, cro, telefone, cpf) values ($1, $2, 'Dr. Carlos', 'CRO 1', '1', '12345678909') returning id",
        [usuarioDentista, clinicaId],
      );
      const paciente = await db.query<{ id: string }>(
        "insert into pacientes (clinica_id, nome) values ($1, 'João') returning id",
        [clinicaId],
      );
      const cadeira = await db.query<{ id: string }>(
        "select id from cadeiras where clinica_id = $1 and identificacao = 'Cadeira 1'",
        [clinicaId],
      );
      return {
        adminId,
        clinicaId,
        dentistaId: dentista.rows[0]!.id,
        pacienteId: paciente.rows[0]!.id,
        cadeiraId: cadeira.rows[0]!.id,
      };
    }

    async function marcar(
      base: Awaited<ReturnType<typeof cenario>>,
      inicio: string,
      fim: string,
      extras: { emergencia?: boolean; pacienteId?: string; dentistaId?: string; cadeiraId?: string } = {},
    ) {
      return db.query(
        `insert into agendamentos (clinica_id, paciente_id, dentista_id, cadeira_id, data_hora_inicio, data_hora_fim, emergencia, criado_por)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          base.clinicaId,
          extras.pacienteId ?? base.pacienteId,
          extras.dentistaId ?? base.dentistaId,
          extras.cadeiraId ?? base.cadeiraId,
          inicio,
          fim,
          extras.emergencia ?? false,
          base.adminId,
        ],
      );
    }

    it('impede sobreposição na cadeira e aceita horários adjacentes, cancelado e emergência', async () => {
      const base = await cenario();
      await marcar(base, '2026-10-15T17:00:00Z', '2026-10-15T17:30:00Z');
      await expect(marcar(base, '2026-10-15T17:15:00Z', '2026-10-15T17:45:00Z')).rejects.toThrow(
        /agendamentos_cadeira_sem_sobreposicao/,
      );
      await marcar(base, '2026-10-15T17:30:00Z', '2026-10-15T18:00:00Z');

      const outroPaciente = await db.query<{ id: string }>(
        "insert into pacientes (clinica_id, nome) values ($1, 'Ana') returning id",
        [base.clinicaId],
      );
      await marcar(base, '2026-10-15T17:00:00Z', '2026-10-15T17:30:00Z', {
        emergencia: true,
        pacienteId: outroPaciente.rows[0]!.id,
      });

      await db.query(
        "update agendamentos set status = 'cancelado' where clinica_id = $1 and emergencia = false and data_hora_inicio = '2026-10-15T17:00:00Z'",
        [base.clinicaId],
      );
      await marcar(base, '2026-10-15T17:00:00Z', '2026-10-15T17:20:00Z', { pacienteId: outroPaciente.rows[0]!.id });
    });

    it('criar_agendamento recusa domingo e horário fora do expediente, e só o service_role executa', async () => {
      const base = await cenario();
      const chamar = (inicio: string, fim: string) =>
        db.query(
          `select public.criar_agendamento($1, $2, $3, $4, null, $5, $6, false, $7)`,
          [base.clinicaId, base.pacienteId, base.dentistaId, base.cadeiraId, inicio, fim, base.adminId],
        );
      await expect(chamar('2026-10-18T14:00:00-03:00', '2026-10-18T14:30:00-03:00')).rejects.toThrow('DIA_SEM_ATENDIMENTO');
      await expect(chamar('2026-10-12T19:00:00-03:00', '2026-10-12T19:30:00-03:00')).rejects.toThrow('FORA_DO_HORARIO');
      const criado = await chamar('2026-10-12T14:00:00-03:00', '2026-10-12T14:30:00-03:00');
      expect(criado.rows[0]).toBeTruthy();

      const assinatura =
        'public.criar_agendamento(uuid, uuid, uuid, uuid, uuid, timestamp with time zone, timestamp with time zone, boolean, uuid)';
      const { rows } = await db.query<{ anon: boolean; service_role: boolean }>(
        `select has_function_privilege('anon', '${assinatura}', 'execute') as anon,
                has_function_privilege('service_role', '${assinatura}', 'execute') as service_role`,
      );
      expect(rows[0]).toEqual({ anon: false, service_role: true });
    });
  });
});
