import Link from 'next/link';
import { Formulario } from '../formulario';
import { solicitarRecuperacao } from '../login/actions';

export default function RecuperarSenhaPage() {
  return (
    <main>
      <h1>Recuperar senha</h1>
      <Formulario action={solicitarRecuperacao}>
        <label>
          Email
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <button type="submit">Enviar link</button>
      </Formulario>
      <p>
        <Link href="/login">Voltar ao login</Link>
      </p>
    </main>
  );
}
