import Link from 'next/link';
import type { ReactNode } from 'react';
import { podeExecutar } from '@/modules/autenticacao';
import { exigirContexto } from '@/lib/sessao';
import { sair } from '../login/actions';

export default async function PainelLayout({ children }: { children: ReactNode }) {
  const ctx = await exigirContexto();
  const temClinica = Boolean(ctx.usuario.clinica_id);
  const links = temClinica
    ? [
        ['/agendamentos', 'Agendamentos'],
        ['/pacientes', 'Pacientes'],
        ['/dentistas', 'Dentistas'],
        ['/procedimentos', 'Procedimentos'],
        ['/clinica', 'Clínica'],
      ]
    : [['/clinica', 'Clínica']];

  return (
    <>
      <nav>
        {links.map(([href, rotulo]) => (
          <Link key={href} href={href!}>
            {rotulo}
          </Link>
        ))}
        <span>
          {ctx.usuario.nome} ({ctx.usuario.papel})
        </span>
        <form action={sair}>
          <button type="submit">Sair</button>
        </form>
      </nav>
      {!temClinica && podeExecutar(ctx.usuario, 'clinica:configurar') ? (
        <p className="alerta">Configure a clínica para liberar os cadastros e a agenda.</p>
      ) : null}
      {children}
    </>
  );
}
