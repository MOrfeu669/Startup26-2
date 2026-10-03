import postgres from 'postgres';
import { afterAll, beforeEach, it } from 'vitest';

/** True quando o Supabase local respondeu no setup; usado em `describe.skipIf(!supabaseLocalDisponivel())`. */
export function supabaseLocalDisponivel(): boolean {
  return globalThis.__SUPABASE_LOCAL_DISPONIVEL__ === true;
}

/** `it` para Cenários que precisam do banco: pulado quando o Supabase local está fora do ar. */
export const itComBanco = it.skipIf(!supabaseLocalDisponivel());

let conexao: postgres.Sql | undefined;

function sql(): postgres.Sql {
  conexao ??= postgres(process.env.SUPABASE_DB_URL!, { max: 1, onnotice: () => {} });
  return conexao;
}

/** Apaga todos os dados de domínio e os usuários do Auth local. Chamar em `beforeEach`. */
export async function limparBanco(): Promise<void> {
  const db = sql();
  const tabelas = await db<{ tablename: string }[]>`
    select tablename from pg_tables where schemaname = 'public'
  `;
  if (tabelas.length > 0) {
    const lista = tabelas.map((t) => `public."${t.tablename}"`).join(', ');
    await db.unsafe(`truncate ${lista} restart identity cascade`);
  }
  await db`delete from auth.users`;
}

/** Executa SQL direto no banco local (só para preparar cenários que a API não expõe, ex.: datas no passado). */
export async function executarSql<T extends postgres.Row[] = postgres.Row[]>(
  consulta: string,
  parametros: postgres.ParameterOrJSON<never>[] = [],
): Promise<T> {
  return (await sql().unsafe(consulta, parametros)) as unknown as T;
}

export async function encerrarConexao(): Promise<void> {
  await conexao?.end();
  conexao = undefined;
}

/** Registra a limpeza do banco antes de cada caso e o fechamento da conexão no fim do arquivo. */
export function usarBancoLimpo(): void {
  if (!supabaseLocalDisponivel()) return;
  beforeEach(limparBanco);
  afterAll(encerrarConexao);
}
