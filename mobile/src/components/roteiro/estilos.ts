/**
 * Disposições repetidas nos componentes do roteiro. Não dependem de cor, por
 * isso ficam fora do tema.
 */

import { StyleSheet } from 'react-native';

import { espaco } from '@/theme/tokens';

export const disposicao = StyleSheet.create({
  /** Rótulo à esquerda e valor à direita, na mesma linha. */
  linhaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaco.sm,
  },
  /** Ícone pequeno seguido de texto. */
  linhaIcone: { flexDirection: 'row', alignItems: 'center', gap: espaco.xs },
});
