/**
 * Injeção de dependência dos serviços.
 *
 * A escolha entre dados simulados e API real é feita por uma variável de
 * ambiente, e não por edição de código:
 *
 *   EXPO_PUBLIC_API_URL definida  -> conversa com a API
 *   EXPO_PUBLIC_API_URL ausente   -> dados simulados
 *
 * Com isso a demonstração continua funcionando sem servidor, e ligar na API
 * é só preencher o .env. Nenhuma tela muda nos dois casos.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { createServicosHttp, ErroApi } from '@/data/http';
import { createServicosMock } from '@/data/mock';
import { hidratarSessao } from '@/data/sessao';
import type { ServicosApp } from '@/data/services';

const ServicosContext = createContext<ServicosApp | null>(null);

export const API_URL = process.env.EXPO_PUBLIC_API_URL?.trim() || null;
export const usandoApiReal = API_URL !== null;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Repetir uma falha de credencial ou de validação não ajuda: só erro
      // de rede e de servidor merecem nova tentativa.
      retry: (tentativas, erro) => {
        if (erro instanceof ErroApi && erro.status >= 400 && erro.status < 500) return false;
        return tentativas < 2;
      },
    },
  },
});

export function ProvedorDeServicos({ children }: { children: ReactNode }) {
  const [sessaoCarregada, setSessaoCarregada] = useState(!usandoApiReal);

  const servicos = useMemo<ServicosApp>(
    () => (API_URL ? createServicosHttp(API_URL) : createServicosMock()),
    [],
  );

  // Recupera o token gravado antes de qualquer requisição, senão a primeira
  // consulta sairia sem autenticação e jogaria o usuário para o login.
  useEffect(() => {
    if (!usandoApiReal) return;
    void hidratarSessao().finally(() => setSessaoCarregada(true));
  }, []);

  if (!sessaoCarregada) return null;

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
