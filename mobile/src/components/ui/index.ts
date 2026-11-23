/**
 * Biblioteca de componentes visuais do RotaFácil (UI-01).
 *
 * Todos os componentes leem a paleta ativa por useCores(), portanto
 * funcionam nos temas claro e escuro sem nenhuma condicional nas telas, e
 * todos os controles dizem ao leitor de tela o que são (botão, opção, caixa
 * de marcação) e em que estado estão.
 */

export { Botao, type BotaoProps } from './botao';
export { Campo } from './campo';
export { Cartao } from './cartao';
export { Chip, GrupoDeOpcoes } from './chip';
export { AvisoDeErro, ErroAoCarregar, Esqueleto, EstadoVazio } from './estados';
export { CabecalhoSecao, CaixaMarcacao, Selo } from './pequenos';
export { Texto, type TextoProps } from './texto';
