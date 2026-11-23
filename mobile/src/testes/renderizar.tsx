/**
 * Renderiza um componente nos testes com o que o app sempre tem em volta (o tema).
 */

import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ProvedorDeTema } from '@/theme/provider';

/** O tema entra como `wrapper`, para continuar valendo num `rerender`. */
export function renderizar(componente: ReactElement) {
  return render(componente, { wrapper: ProvedorDeTema });
}
