'use client';

import { useActionState, type ReactNode } from 'react';

export interface EstadoFormulario {
  erro?: string;
  ok?: string;
}

type Acao = (estado: EstadoFormulario | null, form: FormData) => Promise<EstadoFormulario | null>;

/** Formulário ligado a uma Server Action, com a mensagem de erro do service. */
export function Formulario({ action, children }: { action: Acao; children: ReactNode }) {
  const [estado, executar, pendente] = useActionState(action, null);
  return (
    <form action={executar}>
      {children}
      {estado?.erro ? <p className="erro">{estado.erro}</p> : null}
      {estado?.ok ? <p>{estado.ok}</p> : null}
      {pendente ? <p>Salvando…</p> : null}
    </form>
  );
}
