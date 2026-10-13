/**
 * Injecao de dependencia dos servicos.
 *
 * ESTE E O UNICO ARQUIVO QUE MUDA NA VIRADA PARA O BACKEND.
 * Basta trocar a fabrica abaixo e todo o aplicativo passa a consumir a API.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { createServicosMock } from '@/data/mock';
// import { createServicosHttp } from '@/data/http';
import type { ServicosApp } from '@/data/services';

const ServicosContext = createContext<ServicosApp | null>(null);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

export function ProvedorDeServicos({ children }: { children: ReactNode }) {
  const servicos = useMemo(() => {
    // --- Backend desligado (fase atual): dados simulados -------------------
    return createServicosMock();

    // --- Backend ligado: descomentar a linha abaixo e remover a de cima ----
    // return createServicosHttp(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ServicosContext.Provider value={servicos}>{children}</ServicosContext.Provider>
    </QueryClientProvider>
  );
}

export function useServicos(): ServicosApp {
  const ctx = useContext(ServicosContext);
  if (!ctx) throw new Error('useServicos precisa estar dentro de <ProvedorDeServicos>');
  return ctx;
}
