import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';

const PASTA_MIGRATIONS = join(process.cwd(), 'supabase', 'migrations');

// Simula o mínimo que o Supabase provê (schema auth, schema extensions e papéis), para aplicar as migrations offline.
const STUB_SUPABASE = `
  create schema if not exists auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create schema if not exists extensions;
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
  end $$;
`;

export function listarMigrations(): string[] {
  return readdirSync(PASTA_MIGRATIONS)
    .filter((nome) => nome.endsWith('.sql'))
    .sort();
}

/** Postgres em memória (PGlite) com todas as migrations aplicadas, na ordem dos arquivos. */
export async function criarBancoComMigrations(): Promise<PGlite> {
  const db = await PGlite.create({ extensions: { btree_gist } });
  await db.exec(STUB_SUPABASE);
  for (const arquivo of listarMigrations()) {
    try {
      await db.exec(readFileSync(join(PASTA_MIGRATIONS, arquivo), 'utf8'));
    } catch (erro) {
      throw new Error(`Falha ao aplicar a migration ${arquivo}: ${(erro as Error).message}`, { cause: erro });
    }
  }
  return db;
}

/** Cria um usuário em auth.users (stub) e devolve o id. */
export async function criarAuthUser(db: PGlite, email = `u-${Math.random().toString(36).slice(2)}@teste.local`) {
  const { rows } = await db.query<{ id: string }>('insert into auth.users (email) values ($1) returning id', [email]);
  return rows[0]!.id;
}
