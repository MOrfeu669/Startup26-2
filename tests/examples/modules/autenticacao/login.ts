// Exemplo executável — Feature 001. Rode com: pnpm example tests/examples/modules/autenticacao/login.ts
// Requer o Supabase local no ar (pnpm db:start). Cria uma clínica fictícia, um dentista e faz login.
import { carregarAmbienteLocal } from '@tests/setup/ambiente';

carregarAmbienteLocal();

const { criarClienteAdmin } = await import('@/lib/supabase/admin');
const { criarClienteAnon } = await import('@/lib/supabase/anon');
const { authService } = await import('@/modules/autenticacao');
const { criarClinicaComAdmin } = await import('@tests/fixtures/clinica');

const db = criarClienteAdmin();
const { ctxAdmin } = await criarClinicaComAdmin(db);
const email = `dra.ana+${Date.now()}@clinica.com`;

const dentista = await authService.cadastrarUsuario(ctxAdmin, {
  nome: 'Dra. Ana Souza',
  email,
  senha: 'senha-da-ana',
  papel: 'dentista',
});
console.log('Usuário cadastrado:', dentista);

const sessao = await authService.login({ email, senha: 'senha-da-ana' }, { auth: criarClienteAnon(), db });
console.log('Papel identificado no login:', sessao.usuario.papel);
console.log('Clínica:', sessao.usuario.clinica_id);

try {
  await authService.login({ email, senha: 'errada' }, { auth: criarClienteAnon(), db });
} catch (erro) {
  console.log('Senha incorreta →', (erro as Error).message);
}
