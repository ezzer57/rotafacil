/**
 * Tamanho dos mapas conforme a tela.
 *
 * No celular o mapa fica numa caixa vertical (mais alta que larga), com espaço
 * para arrastar e dar zoom sem esbarrar no resto da tela. No navegador de
 * computador, a tela do roteiro põe o mapa numa coluna ao lado da lista, com a
 * altura da janela inteira.
 */

import { useWindowDimensions } from 'react-native';

/** A partir desta largura, a tela do roteiro usa duas colunas: mapa e lista. */
export const LARGURA_DUAS_COLUNAS = 1000;

/** Altura proporcional à da janela, dentro de um mínimo e de um máximo. */
export function useAlturaDoMapa(proporcao: number, minima: number, maxima: number): number {
  const { height } = useWindowDimensions();
  return Math.round(Math.min(maxima, Math.max(minima, height * proporcao)));
}
