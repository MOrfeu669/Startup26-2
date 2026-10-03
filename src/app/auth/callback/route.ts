import { NextResponse } from 'next/server';
import { criarClienteServidor } from '@/lib/supabase/server';

/** Troca o código do email de recuperação pela sessão e abre a tela de nova senha. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (code) {
    const supabase = await criarClienteServidor();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL('/redefinir-senha', url.origin));
}
