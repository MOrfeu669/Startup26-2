import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Cliente do navegador. As tabelas de domínio têm RLS sem políticas, então ele só serve para Auth (e Realtime, a partir da 007). */
export function criarClienteNavegador(): SupabaseClient {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
