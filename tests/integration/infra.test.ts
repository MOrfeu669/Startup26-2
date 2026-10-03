import { afterAll, describe, expect, it } from 'vitest';
import { criarClienteAdmin } from '@/lib/supabase/admin';
import { encerrarConexao, executarSql, supabaseLocalDisponivel } from '@tests/support/banco';

describe.skipIf(!supabaseLocalDisponivel())('Infra — Supabase local', () => {
  afterAll(encerrarConexao);

  it('conecta ao Postgres local', async () => {
    const [linha] = await executarSql<{ ok: number }[]>('select 1 as ok');
    expect(linha?.ok).toBe(1);
  });

  it('acessa a API administrativa do Auth local', async () => {
    const { error } = await criarClienteAdmin().auth.admin.listUsers({ page: 1, perPage: 1 });
    expect(error).toBeNull();
  });
});
