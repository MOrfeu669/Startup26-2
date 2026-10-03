import { z } from 'zod';

const MASCARA = /[.\-\s]/g;
const ONZE_DIGITOS = /^\d{11}$/;

/** Remove a máscara (pontos, hífen e espaços). Não valida: use `cpfSchema` para isso. */
export function normalizarCpf(valor: string): string {
  return valor.replace(MASCARA, '');
}

/** "00000000000" → "000.000.000-00". Valores fora do formato voltam como vieram. */
export function formatarCpf(cpf: string): string {
  const digitos = normalizarCpf(cpf);
  if (!ONZE_DIGITOS.test(digitos)) return cpf;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

/**
 * CPF com ou sem máscara; a saída tem só os 11 dígitos (é o que se grava no banco).
 * O dígito verificador não é conferido: nenhuma spec define essa validação.
 */
export const cpfSchema = z
  .string('CPF obrigatório')
  .trim()
  .min(1, 'CPF obrigatório')
  .transform(normalizarCpf)
  .pipe(z.string().regex(ONZE_DIGITOS, 'CPF deve ter 11 dígitos'));
