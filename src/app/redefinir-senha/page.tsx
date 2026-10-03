import Link from 'next/link';
import { Formulario } from '../formulario';
import { definirNovaSenha } from '../login/actions';

export default function RedefinirSenhaPage() {
  return (
    <main>
      <h1>Nova senha</h1>
      <p>Use o link recebido por email. A sessão de recuperação precisa estar aberta nesta página.</p>
      <Formulario action={definirNovaSenha}>
        <label>
          Nova senha
          <input name="novaSenha" type="password" autoComplete="new-password" minLength={6} required />
        </label>
        <button type="submit">Salvar senha</button>
      </Formulario>
      <p>
        <Link href="/login">Voltar ao login</Link>
      </p>
    </main>
  );
}
