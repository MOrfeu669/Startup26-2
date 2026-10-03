import { carregarAmbienteLocal } from './ambiente';

carregarAmbienteLocal();

async function verificarSupabaseLocal(): Promise<boolean> {
  try {
    const resposta = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      signal: AbortSignal.timeout(2_000),
    });
    return resposta.ok;
  } catch {
    return false;
  }
}

const disponivel = await verificarSupabaseLocal();
if (!disponivel) {
  console.warn('[integração] Supabase local fora do ar (rode `pnpm db:start`). Testes de integração serão pulados.');
}
globalThis.__SUPABASE_LOCAL_DISPONIVEL__ = disponivel;

declare global {
  var __SUPABASE_LOCAL_DISPONIVEL__: boolean | undefined;
}
