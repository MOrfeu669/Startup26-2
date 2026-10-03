export * from './types';
export {
  PERMISSOES,
  clinicaDoUsuario,
  exigirMesmaClinica,
  exigirPermissao,
  podeExecutar,
  type Acao,
} from './services/autorizacao';
export * as authService from './services/auth-service';
export {
  carregarUsuario,
  desfazerCadastroUsuario,
  type DepsAuth,
  type ResultadoLogin,
} from './services/auth-service';
