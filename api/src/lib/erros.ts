/**
 * Erros da aplicação.
 *
 * Toda falha esperada vira um ErroApp com código estável, que o aplicativo
 * pode tratar sem depender do texto da mensagem. Falhas inesperadas viram
 * 500 genérico, sem vazar detalhes internos para o cliente.
 */

export type CodigoErro =
  | 'VALIDACAO'
  | 'NAO_AUTENTICADO'
  | 'CREDENCIAL_INVALIDA'
  | 'SEM_PERMISSAO'
  | 'NAO_ENCONTRADO'
  | 'CONFLITO'
  | 'EXCESSO_REQUISICOES'
  | 'CORPO_GRANDE_DEMAIS'
  | 'JSON_INVALIDO'
  | 'REGRA_DE_NEGOCIO'
  | 'INTERNO';

export class ErroApp extends Error {
  constructor(
    readonly codigo: CodigoErro,
    readonly status: number,
    mensagem: string,
    readonly detalhes?: unknown,
  ) {
    super(mensagem);
    this.name = 'ErroApp';
  }
}

export const erroValidacao = (mensagem: string, detalhes?: unknown) =>
  new ErroApp('VALIDACAO', 422, mensagem, detalhes);

export const naoAutenticado = (mensagem = 'Autenticação necessária') =>
  new ErroApp('NAO_AUTENTICADO', 401, mensagem);

/** Mensagem propositalmente genérica: não revela se o e-mail existe. */
export const credencialInvalida = () =>
  new ErroApp('CREDENCIAL_INVALIDA', 401, 'E-mail ou senha incorretos');

export const semPermissao = (mensagem = 'Acesso negado a este recurso') =>
  new ErroApp('SEM_PERMISSAO', 403, mensagem);

export const naoEncontrado = (recurso: string) =>
  new ErroApp('NAO_ENCONTRADO', 404, `${recurso} não encontrado`);

export const conflito = (mensagem: string) => new ErroApp('CONFLITO', 409, mensagem);

export const regraDeNegocio = (mensagem: string, detalhes?: unknown) =>
  new ErroApp('REGRA_DE_NEGOCIO', 400, mensagem, detalhes);
