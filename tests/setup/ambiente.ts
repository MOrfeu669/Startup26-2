import { existsSync } from 'node:fs';

// Chaves de demonstração fixas do Supabase CLI local (não servem para nenhum projeto real).
const PADRAO_LOCAL = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  SUPABASE_SERVICE_ROLE_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp5fsn1W0_wGN0zU',
  SUPABASE_DB_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3000',
};

/** Carrega `.env.local` (se existir) e completa com os padrões do Supabase local. Nunca aponta para produção. */
export function carregarAmbienteLocal(): void {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  for (const [chave, valor] of Object.entries(PADRAO_LOCAL)) {
    process.env[chave] ??= valor;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (!/127\.0\.0\.1|localhost/.test(url)) {
    throw new Error(`Os testes só rodam contra o Supabase local, mas NEXT_PUBLIC_SUPABASE_URL=${url}`);
  }
}
