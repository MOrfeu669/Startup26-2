/** Erro de regra de negócio. A mensagem segue o texto exato da spec, quando a spec define um. */
export class ErroNegocio extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroNegocio';
  }
}

/** Ação bloqueada pelo papel do usuário ou pelo isolamento entre clínicas. */
export class ErroPermissao extends ErroNegocio {
  constructor(mensagem = 'Ação não permitida para seu papel') {
    super(mensagem);
    this.name = 'ErroPermissao';
  }
}

/** Entrada inválida (falha de schema Zod ou de regra de preenchimento). */
export class ErroValidacao extends ErroNegocio {
  constructor(
    mensagem: string,
    public readonly campos: Record<string, string[]> = {},
  ) {
    super(mensagem);
    this.name = 'ErroValidacao';
  }
}

/** Erro inesperado de infraestrutura (banco, Auth). */
export class ErroInfra extends Error {
  constructor(mensagem: string, options?: { cause?: unknown }) {
    super(mensagem, options);
    this.name = 'ErroInfra';
  }
}

export function falhaDoBanco(operacao: string, erro: { message: string } | null): never {
  throw new ErroInfra(`Falha ao ${operacao}: ${erro?.message ?? 'erro desconhecido'}`, { cause: erro });
}
