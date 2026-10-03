import type { z } from 'zod';
import { ErroValidacao } from '@/lib/erros';

/** Valida a entrada com o schema do caso de uso e converte a falha em `ErroValidacao`. */
export function validar<S extends z.ZodType>(schema: S, entrada: unknown): z.infer<S> {
  const resultado = schema.safeParse(entrada);
  if (resultado.success) return resultado.data;

  const campos: Record<string, string[]> = {};
  for (const issue of resultado.error.issues) {
    const chave = issue.path.join('.') || '_';
    (campos[chave] ??= []).push(issue.message);
  }
  const primeira = resultado.error.issues[0]?.message ?? 'Dados inválidos';
  throw new ErroValidacao(primeira, campos);
}
