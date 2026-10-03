// Exemplo executável — Feature 002. Rode com: pnpm example tests/examples/modules/clinica/criar-clinica.ts
// Requer o Supabase local no ar (pnpm db:start). Cria um Admin, a clínica dele e mexe em cadeiras e horário.
import { carregarAmbienteLocal } from '@tests/setup/ambiente';

carregarAmbienteLocal();

const { criarClienteAdmin } = await import('@/lib/supabase/admin');
const { authService, carregarUsuario } = await import('@/modules/autenticacao');
const { alertasDoAgendamento, clinicaService, dentroDoFuncionamento } = await import('@/modules/clinica');

const db = criarClienteAdmin();
const adminSemClinica = await authService.registrarAdmin(db, {
  nome: 'Dr. Dono',
  email: `dono+${Date.now()}@odontosmile.com`,
  senha: 'senha-do-dono',
});

const clinica = await clinicaService.criar(
  { db, usuario: adminSemClinica },
  {
    nome: 'Clínica OdontoSmile',
    dias_atendimento: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
    horario_abertura: '08:00',
    horario_fechamento: '18:00',
    cadeiras: 3,
  },
);
console.log('Clínica criada:', clinica);

const admin = (await carregarUsuario(db, adminSemClinica.id))!;
const ctx = { db, usuario: admin };
console.log('Admin vinculado à clínica:', admin.clinica_id);

const nova = await clinicaService.adicionarCadeira(ctx);
console.log('Cadeira adicionada:', nova.identificacao);

const cadeira2 = clinica.cadeiras.find((c) => c.identificacao === 'Cadeira 2')!;
const desativada = await clinicaService.desativarCadeira(ctx, cadeira2.id);
const ativas = await clinicaService.listarCadeiras(ctx, { apenasAtivas: true });
console.log('Cadeiras disponíveis para agendamento:', ativas.map((c) => c.identificacao));

const atualizada = await clinicaService.atualizarHorario(ctx, { horario_abertura: '08:00', horario_fechamento: '17:00' });
console.log('Novo horário:', `${atualizada.horario_abertura}–${atualizada.horario_fechamento}`);

const inicio = '2026-10-15T17:30:00-03:00';
const fim = '2026-10-15T18:00:00-03:00';
console.log('Agendamento 17:30–18:00 dentro do funcionamento?', dentroDoFuncionamento(atualizada, inicio, fim));
console.log('Alertas se fosse na Cadeira 2:', alertasDoAgendamento({ clinica: atualizada, cadeira: desativada, inicio, fim }));

try {
  await clinicaService.criar(ctx, { nome: 'Outra', dias_atendimento: ['segunda'], cadeiras: 1 });
} catch (erro) {
  console.log('Segunda clínica para o mesmo Admin →', (erro as Error).message);
}
