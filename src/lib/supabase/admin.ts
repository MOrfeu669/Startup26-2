import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/**
 * Cliente com service role: ignora RLS. Uso exclusivo no servidor (services, testes, scripts).
 * O isolamento por clínica é garantido pelos services, que sempre filtram por `clinica_id`.
 */
export function criarClienteAdmin(): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
