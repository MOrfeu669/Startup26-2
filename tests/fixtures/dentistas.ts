import { randomUUID } from 'node:crypto';
import type { Contexto } from '@/modules/autenticacao';
import { dentistaService, type CadastrarDentistaInput, type Dentista } from '@/modules/dentistas';
import { SENHA_PADRAO } from './usuarios';

export interface DentistaDeTeste {
  dentista: Dentista;
  email: string;
  senha: string;
}

/** Cadastra um dentista (e o login dele) pelo `dentistaService`, com email único. Requer contexto de Admin. */
export async function criarDentistaDeTeste(
  ctxAdmin: Contexto,
  overrides: Partial<CadastrarDentistaInput> = {},
): Promise<DentistaDeTeste> {
  const sufixo = randomUUID().slice(0, 8);
  const dados = {
    nome: `Dr. Teste ${sufixo}`,
    cro: `CRO-RS ${sufixo}`,
    telefone: '(54) 99999-0000',
    cpf: '123.456.789-09',
    email_login: `dentista-${sufixo}@teste.local`,
    senha: SENHA_PADRAO,
    ...overrides,
  } satisfies CadastrarDentistaInput;

  const dentista = await dentistaService.cadastrar(ctxAdmin, dados);
  return { dentista, email: dados.email_login, senha: dados.senha };
}
