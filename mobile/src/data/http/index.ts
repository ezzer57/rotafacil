/**
 * Implementação HTTP dos serviços: a ponte com a API em Node.js.
 *
 * Esta é a camada que troca de lugar com o mock. Nenhuma tela sabe que ela
 * existe: todas conversam com as interfaces de src/data/services.ts.
 *
 * Responsabilidades daqui, e de mais nenhum lugar:
 *  - montar a requisição com o token da sessão;
 *  - transformar o erro da API no formato que as telas exibem;
 *  - adaptar diferenças entre o formato da API e o do domínio do aplicativo
 *    (por exemplo, a listagem paginada).
 */

import { definirToken, encerrarSessao, tokenAtual } from '@/data/sessao';
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

/** Tempo máximo de espera por resposta. Rede de celular em viagem oscila. */
const TEMPO_LIMITE_MS = 15_000;

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

interface RespostaAutenticacao {
  usuario: Usuario;
  token: string;
}

interface PaginaRoteiros {
  itens: ResumoRoteiro[];
  total: number;
  pagina: number;
  limite: number;
}

export function createServicosHttp(baseUrl: string): ServicosApp {
  const url = baseUrl.replace(/\/$/, '');

  async function req<T>(caminho: string, init?: RequestInit): Promise<T> {
    const token = tokenAtual();
    const controle = new AbortController();
    const expirou = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);

    let resposta: Response;
    try {
      resposta = await fetch(`${url}${caminho}`, {
        ...init,
        signal: controle.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init?.headers,
        },
      });
    } catch (erro) {
      // Falha de rede não é erro da API: a mensagem precisa dizer isso.
      if (erro instanceof Error && erro.name === 'AbortError') {
        throw new ErroApi(0, 'O servidor demorou demais para responder', 'TEMPO_ESGOTADO');
      }
      throw new ErroApi(0, 'Sem conexão com o servidor', 'SEM_REDE');
    } finally {
      clearTimeout(expirou);
    }

    if (resposta.status === 204) return undefined as T;

    const corpo = await resposta.json().catch(() => null);

    if (!resposta.ok) {
      // Token expirado ou inválido: encerra a sessão para a guarda de rota
      // levar o usuário de volta ao login.
      if (resposta.status === 401) void encerrarSessao();

      throw new ErroApi(
        resposta.status,
        corpo?.erro?.mensagem ?? 'Não foi possível completar a operação',
        corpo?.erro?.codigo,
      );
    }

    return corpo as T;
  }

  const json = (corpo: unknown) => ({ body: JSON.stringify(corpo) });

  /** Guarda o token devolvido pela API e entrega só o usuário às telas. */
  async function autenticarE(guardar: Promise<RespostaAutenticacao>): Promise<Usuario> {
    const { usuario, token } = await guardar;
    await definirToken(token);
    return usuario;
  }

  return {
    roteiros: {
      gerar: (preferencias: PreferenciasRoteiro) =>
        req<Roteiro>('/v1/itineraries', { method: 'POST', ...json(preferencias) }),

      obter: (id: ID) => req<Roteiro>(`/v1/itineraries/${id}`),

      // A API pagina; as telas só precisam da lista.
      listar: async () => {
        const pagina = await req<PaginaRoteiros>('/v1/itineraries?limite=50&pagina=1');
        return pagina.itens;
      },

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
      obter: (pontoId: ID) => req<PontoInteresse>(`/v1/places/${encodeURIComponent(pontoId)}`),
    },

    auth: {
      // Sem token guardado não há motivo para perguntar ao servidor.
      usuarioAtual: async () => (tokenAtual() ? req<Usuario>('/v1/me') : null),

      entrar: (email: string, senha: string) =>
        autenticarE(
          req<RespostaAutenticacao>('/v1/sessions', { method: 'POST', ...json({ email, senha }) }),
        ),

      registrar: (nome: string, email: string, senha: string) =>
        autenticarE(
          req<RespostaAutenticacao>('/v1/users', {
            method: 'POST',
            ...json({ nome, email, senha }),
          }),
        ),

      // O JWT não guarda estado no servidor: sair é descartar o token.
      sair: () => encerrarSessao(),
    },
  };
}
