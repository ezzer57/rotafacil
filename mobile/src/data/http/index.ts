/**
 * Implementacao HTTP dos servicos: a ponte com o backend Node.js/Express.
 *
 * O arquivo ja esta escrito e nao e usado ainda. Quando a API subir, a unica
 * mudanca necessaria no aplicativo inteiro e, em src/data/provider.tsx:
 *
 *   -  const servicos = createServicosMock();
 *   +  const servicos = createServicosHttp(process.env.EXPO_PUBLIC_API_URL!);
 *
 * Nenhuma tela, componente ou hook precisa ser alterado.
 */

import type { ServicosApp } from '@/data/services';
import type {
  Cidade,
  ID,
  PontoInteresse,
  PreferenciasRoteiro,
  ResumoRoteiro,
  Roteiro,
  Usuario,
  Visita,
} from '@/domain/types';

export class ErroApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

export function createServicosHttp(baseUrl: string, obterToken?: () => string | null): ServicosApp {
  async function req<T>(caminho: string, init?: RequestInit): Promise<T> {
    const token = obterToken?.();
    const resposta = await fetch(`${baseUrl}${caminho}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });

    if (!resposta.ok) {
      const corpo = await resposta.text();
      throw new ErroApi(resposta.status, corpo || resposta.statusText);
    }
    if (resposta.status === 204) return undefined as T;
    return (await resposta.json()) as T;
  }

  const json = (body: unknown) => ({ body: JSON.stringify(body) });

  return {
    roteiros: {
      gerar: (preferencias: PreferenciasRoteiro) =>
        req<Roteiro>('/v1/itineraries', { method: 'POST', ...json(preferencias) }),
      obter: (id: ID) => req<Roteiro>(`/v1/itineraries/${id}`),
      listar: () => req<ResumoRoteiro[]>('/v1/itineraries'),
      removerPonto: (roteiroId: ID, pontoId: ID) =>
        req<Roteiro>(`/v1/itineraries/${roteiroId}`, {
          method: 'PATCH',
          ...json({ operacao: 'remover', pontoId }),
        }),
      substituirPonto: (roteiroId: ID, pontoId: ID) =>
        req<Roteiro>(`/v1/itineraries/${roteiroId}`, {
          method: 'PATCH',
          ...json({ operacao: 'substituir', pontoId }),
        }),
      ajustarOrcamento: (roteiroId: ID, orcamento: number) =>
        req<Roteiro>(`/v1/itineraries/${roteiroId}`, {
          method: 'PATCH',
          ...json({ operacao: 'orcamento', orcamento }),
        }),
      registrarVisita: (roteiroId: ID, pontoId: ID) =>
        req<Visita>(`/v1/itineraries/${roteiroId}/checkins`, {
          method: 'POST',
          ...json({ pontoId }),
        }),
      excluir: (roteiroId: ID) =>
        req<void>(`/v1/itineraries/${roteiroId}`, { method: 'DELETE' }),
    },

    cidades: {
      listar: () => req<Cidade[]>('/v1/cities'),
      buscar: (termo: string) => req<Cidade[]>(`/v1/cities?q=${encodeURIComponent(termo)}`),
    },

    pontos: {
      obter: (pontoId: ID) => req<PontoInteresse>(`/v1/places/${pontoId}`),
    },

    auth: {
      usuarioAtual: () => req<Usuario | null>('/v1/me'),
      entrar: (email: string, senha: string) =>
        req<Usuario>('/v1/sessions', { method: 'POST', ...json({ email, senha }) }),
      registrar: (nome: string, email: string, senha: string) =>
        req<Usuario>('/v1/users', { method: 'POST', ...json({ nome, email, senha }) }),
      sair: () => req<void>('/v1/sessions', { method: 'DELETE' }),
    },
  };
}
