// Exemplo executável — Feature 005. Rode com: pnpm example tests/examples/modules/procedimentos/criar-procedimento.ts
import { carregarAmbienteLocal } from '@tests/setup/ambiente';

carregarAmbienteLocal();

const { criarClienteAdmin } = await import('@/lib/supabase/admin');
const { authService, carregarUsuario } = await import('@/modules/autenticacao');
const { clinicaService } = await import('@/modules/clinica');
const { procedimentoService, sugerirTermino } = await import('@/modules/procedimentos');

const db = criarClienteAdmin();
const sufixo = Date.now();
const adminSemClinica = await authService.registrarAdmin(db, {
  nome: 'Dr. Dono',
  email: `dono+${sufixo}@odontosmile.com`,
  senha: 'senha-do-dono',
});
await clinicaService.criar(
  { db, usuario: adminSemClinica },
  { nome: 'Clínica OdontoSmile', dias_atendimento: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'], cadeiras: 1 },
);
const ctx = { db, usuario: (await carregarUsuario(db, adminSemClinica.id))! };

const procedimento = await procedimentoService.criar(ctx, {
  nome: 'Avaliação/Consulta',
  tempo_medio_minutos: 30,
  valor_medio: 150,
});
console.log('Procedimento:', procedimento);
console.log('Término sugerido para 14:00:', sugerirTermino(new Date('2026-10-15T14:00:00-03:00'), procedimento.tempo_medio_minutos).toISOString());

await procedimentoService.excluir(ctx, procedimento.id);
console.log('Excluído. Restantes:', (await procedimentoService.listar(ctx)).length);
