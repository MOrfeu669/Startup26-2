import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/** Cliente de Auth do lado do servidor (Server Components, Server Actions, Route Handlers), com sessão em cookies. */
export async function criarClienteServidor(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) cookieStore.set(name, value, options);
        } catch {
          // Em Server Components os cookies são somente leitura; o middleware renova a sessão.
        }
      },
    },
  });
}
