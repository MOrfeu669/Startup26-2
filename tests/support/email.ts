const MAILPIT_URL = process.env.SUPABASE_MAILPIT_URL ?? 'http://127.0.0.1:54324';

/** Quantidade de emails recebidos pelo servidor de teste local (Mailpit do Supabase CLI) para o destinatário. */
export async function contarEmailsPara(destinatario: string): Promise<number> {
  const url = `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${destinatario}"`)}`;
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`Mailpit indisponível (${resposta.status}) em ${MAILPIT_URL}`);
  const corpo = (await resposta.json()) as { messages_count?: number; messages?: unknown[] };
  return corpo.messages_count ?? corpo.messages?.length ?? 0;
}

/** Aguarda o email chegar (o envio do Auth é assíncrono). */
export async function aguardarEmailPara(destinatario: string, tentativas = 20): Promise<number> {
  for (let i = 0; i < tentativas; i++) {
    const total = await contarEmailsPara(destinatario);
    if (total > 0) return total;
    await new Promise((r) => setTimeout(r, 250));
  }
  return 0;
}
