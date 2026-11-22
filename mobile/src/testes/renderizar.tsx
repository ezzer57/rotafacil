/**
 * Renderiza um componente nos testes com o que o app sempre tem em volta (o tema).
 */

import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ProvedorDeTema } from '@/theme/provider';

export function renderizar(componente: ReactElement) {
  return render(<ProvedorDeTema>{componente}</ProvedorDeTema>);
}
