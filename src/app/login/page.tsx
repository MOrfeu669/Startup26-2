import Link from 'next/link';
import { Formulario } from '../formulario';
import { entrar } from './actions';

export default function LoginPage() {
  return (
    <main>
      <h1>Entrar</h1>
      <Formulario action={entrar}>
        <label>
          Email
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Senha
          <input name="senha" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit">Entrar</button>
      </Formulario>
      <p>
        <Link href="/recuperar-senha">Esqueci minha senha</Link>
      </p>
    </main>
  );
}
