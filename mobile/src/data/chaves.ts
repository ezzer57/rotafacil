/**
 * Chaves do cache de dados (React Query). Ficam num arquivo próprio porque
 * os hooks e o provedor de serviços usam as mesmas.
 */

import type { ID } from '@/domain/types';

export const chaves = {
  cidades: ['cidades'] as const,
  roteiros: ['roteiros'] as const,
  roteiro: (id: ID) => ['roteiro', id] as const,
  ponto: (id: ID) => ['ponto', id] as const,
  usuario: ['usuario'] as const,
};
