/**
 * Erro que as telas exibem, venha da API ou do modo de demonstração.
 *
 * `status` segue o HTTP (0 quando nem houve resposta, por falta de rede) e
 * `codigo` é o código estável da API (NAO_ENCONTRADO, SEM_REDE...). O cache
 * usa o status para decidir se vale tentar de novo.
 */
export class ErroApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
    readonly codigo?: string,
  ) {
    super(mensagem);
    this.name = 'ErroApi';
  }
}
