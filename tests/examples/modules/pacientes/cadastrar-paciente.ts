// Exemplo executável — Feature 004. Rode com: pnpm example tests/examples/modules/pacientes/cadastrar-paciente.ts
// Requer o Supabase local no ar (pnpm db:start).
import { carregarAmbienteLocal } from '@tests/setup/ambiente';

carregarAmbienteLocal();

const { criarClienteAdmin } = await import('@/lib/supabase/admin');
const { formatarCpf } = await import('@/lib/cpf');
const { authService, carregarUsuario } = await import('@/modules/autenticacao');
const { clinicaService } = await import('@/modules/clinica');
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
  { nome: 'Clínica OdontoSmile', dias_atendimento: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'], cadeiras: 3 },
);
const ctx = { db, usuario: (await carregarUsuario(db, adminSemClinica.id))! };

const paciente = await pacienteService.cadastrar(ctx, {
  nome: 'João Pereira',
  canais_comunicacao: [
    { canal: 'whatsapp', contato: '(54) 99999-0000', preferido: true },
    { canal: 'email', contato: 'joao@email.com', preferido: false },
  ],
  cpf: '000.000.000-00',
  endereco: 'Rua das Flores, 123',
  data_nascimento: '1990-05-10',
  sexo: 'masculino',
});
console.log('Paciente:', { ...paciente, cpf: formatarCpf(paciente.cpf ?? ''), idade: paciente.idade });

const menor = await pacienteService.cadastrar(ctx, {
  nome: 'Maria Pereira',
  canais_comunicacao: [{ canal: 'sms', contato: '(54) 98888-0000', preferido: true }],
  data_nascimento: '2015-03-20',
  sexo: 'feminino',
  responsavel_legal: { nome: 'João Pereira', cpf: '000.000.000-00' },
});
console.log('Menor:', menor.nome, 'responsável:', menor.responsavel_legal?.nome, 'idade:', menor.idade);

const editado = await pacienteService.editar(ctx, paciente.id, {
  canais_comunicacao: [
    { canal: 'whatsapp', contato: '(54) 98888-1111', preferido: true },
    { canal: 'email', contato: 'joao@email.com', preferido: false },
  ],
});
console.log('WhatsApp atualizado:', editado.canais_comunicacao.find((canal) => canal.preferido)?.contato);
