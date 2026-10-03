function obrigatoria(nome: string, valor: string | undefined): string {
  if (!valor) throw new Error(`Variável de ambiente ausente: ${nome}`);
  return valor;
}

// Acesso literal a process.env.NEXT_PUBLIC_* para o Next.js conseguir embutir os valores no bundle do navegador.
export const env = {
  get supabaseUrl() {
    return obrigatoria('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabaseAnonKey() {
    return obrigatoria('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
  get supabaseServiceRoleKey() {
    return obrigatoria('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000';
  },
};
