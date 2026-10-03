// Cria o Admin de uma clínica nova. Uso: pnpm admin:criar "Nome" email@clinica.com senha
// ⚠️ PENDENTE (Feature 001): a spec não define como o primeiro Admin é criado; este script cobre o bootstrap.
import { existsSync } from 'node:fs';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const [nome, email, senha] = process.argv.slice(2);
if (!nome || !email || !senha) {
  console.error('Uso: pnpm admin:criar "Nome" email@clinica.com senha');
  process.exit(1);
}

const { criarClienteAdmin } = await import('@/lib/supabase/admin');
const { authService } = await import('@/modules/autenticacao');

const admin = await authService.registrarAdmin(criarClienteAdmin(), { nome, email, senha });
console.log(`Admin criado: ${admin.nome} <${admin.email}> (id ${admin.id}). Faça login e crie a clínica.`);
