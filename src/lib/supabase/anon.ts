import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/** Cliente com a chave pública, sem cookies. Usado em testes, exemplos e scripts para operações de Auth. */
export function criarClienteAnon(): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
