// Exemplo executável — Feature 003. Rode com: pnpm example tests/examples/modules/dentistas/cadastrar-dentista.ts
// Requer o Supabase local no ar (pnpm db:start). Cria Admin + clínica, cadastra, edita e remove um dentista.
import { carregarAmbienteLocal } from '@tests/setup/ambiente';

carregarAmbienteLocal();

const { criarClienteAdmin } = await import('@/lib/supabase/admin');
const { criarClienteAnon } = await import('@/lib/supabase/anon');
const { formatarCpf } = await import('@/lib/cpf');
const { authService, carregarUsuario } = await import('@/modules/autenticacao');
const { clinicaService } = await import('@/modules/clinica');
const { dentistaService } = await import('@/modules/dentistas');

const db = criarClienteAdmin();
const sufixo = Date.now();
const adminSemClinica = await authService.registrarAdmin(db, {
  nome: 'Dr. Dono',
  email: `dono+${sufixo}@odontosmile.com`,
  senha: 'senha-do-dono',
});
await clinicaService.criar(
  { db, usuario: adminSemClinica },
  { nome: 'Clínica OdontoSmile', dias_atendimento: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'], cadeiras: 3 },
);
const ctx = { db, usuario: (await carregarUsuario(db, adminSemClinica.id))! };

const emailLogin = `dra.ana+${sufixo}@clinica.com`;
const dentista = await dentistaService.cadastrar(ctx, {
  nome: 'Dra. Ana Souza',
  cro: 'CRO-RS 12345',
  telefone: '(54) 99999-0000',
  cpf: '000.000.000-00',
  email_login: emailLogin,
  senha: 'senha-da-ana',
  especialidades: ['Endodontia'],
});
console.log('Dentista cadastrado:', { ...dentista, cpf: formatarCpf(dentista.cpf) });

const { usuario } = await authService.login({ email: emailLogin, senha: 'senha-da-ana' }, { auth: criarClienteAnon(), db });
console.log('Login do dentista com papel:', usuario.papel);

const editado = await dentistaService.editar(ctx, dentista.id, { telefone: '(54) 98888-1111' });
console.log('Telefone atualizado:', editado.telefone);

const disponiveis = await dentistaService.listar(ctx, { apenasAtivos: true });
console.log('Disponíveis para agendamento:', disponiveis.map((d) => d.nome));

const removido = await dentistaService.remover(ctx, dentista.id);
console.log('Removido (ativo):', removido.ativo);
console.log('Disponíveis depois da remoção:', (await dentistaService.listar(ctx, { apenasAtivos: true })).length);

try {
  await authService.login({ email: emailLogin, senha: 'senha-da-ana' }, { auth: criarClienteAnon(), db });
} catch (erro) {
  console.log('Login do dentista removido →', (erro as Error).message);
}
