import Link from 'next/link';
import { Formulario } from '../formulario';
import { cadastrarAdminClinica } from './actions';

export default function CadastroClinicaPage() {
  return (
    <main>
      <h1>Cadastrar nova clínica</h1>
      <p>Crie a conta do Admin. Em seguida você configura o nome, o horário e as cadeiras da clínica.</p>
      <Formulario action={cadastrarAdminClinica}>
        <label>
          Nome
          <input name="nome" autoComplete="name" required />
        </label>
        <label>
          Email
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Senha
          <input name="senha" type="password" autoComplete="new-password" minLength={6} required />
        </label>
        <button type="submit">Continuar</button>
      </Formulario>
      <p>
        <Link href="/login">Já tenho conta — entrar</Link>
      </p>
    </main>
  );
}
