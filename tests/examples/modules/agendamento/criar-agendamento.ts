// Exemplo executável — Feature 006. Rode com: pnpm example tests/examples/modules/agendamento/criar-agendamento.ts
import { carregarAmbienteLocal } from '@tests/setup/ambiente';

carregarAmbienteLocal();

const { criarClienteAdmin } = await import('@/lib/supabase/admin');
const { authService, carregarUsuario } = await import('@/modules/autenticacao');
const { agendamentoService } = await import('@/modules/agendamento');
const { clinicaService } = await import('@/modules/clinica');
const { dentistaService } = await import('@/modules/dentistas');
const { pacienteService } = await import('@/modules/pacientes');

const db = criarClienteAdmin();
const sufixo = Date.now();
const adminSemClinica = await authService.registrarAdmin(db, {
  nome: 'Dr. Dono',
  email: `dono+${sufixo}@odontosmile.com`,
  senha: 'senha-do-dono',
});
await clinicaService.criar(
  { db, usuario: adminSemClinica },
  { nome: 'Clínica OdontoSmile', dias_atendimento: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'], cadeiras: 2 },
);
const ctx = { db, usuario: (await carregarUsuario(db, adminSemClinica.id))! };

const dentista = await dentistaService.cadastrar(ctx, {
  nome: 'Dr. Carlos',
  cro: 'CRO-RS 1',
  telefone: '(54) 99999-0000',
  cpf: '123.456.789-09',
  email_login: `carlos+${sufixo}@clinica.com`,
  senha: 'senha-do-carlos',
});
const paciente = await pacienteService.cadastrar(ctx, {
  nome: 'João Pereira',
  canais_comunicacao: [{ canal: 'whatsapp', contato: '(54) 99999-0000', preferido: true }],
});
const [cadeira] = await clinicaService.listarCadeiras(ctx, { apenasAtivas: true });

const agendamento = await agendamentoService.criar(ctx, {
  paciente_id: paciente.id,
  dentista_id: dentista.id,
  cadeira_id: cadeira!.id,
  data_hora_inicio: '2026-10-15T14:00:00-03:00',
  data_hora_fim: '2026-10-15T14:30:00-03:00',
});
console.log('Agendamento', agendamento.id, agendamento.status);

try {
  await agendamentoService.criar(ctx, {
    paciente_id: paciente.id,
    dentista_id: dentista.id,
    cadeira_id: cadeira!.id,
    data_hora_inicio: '2026-10-15T14:00:00-03:00',
    data_hora_fim: '2026-10-15T14:30:00-03:00',
  });
} catch (erro) {
  console.log('Segunda tentativa →', (erro as Error).message);
}
