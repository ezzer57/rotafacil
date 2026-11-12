/**
 * Cliente do servidor de rotas OSRM (dados do OpenStreetMap, licença ODbL).
 *
 * Responde a duas perguntas:
 *  - qual a distância e o tempo entre todos os pares de pontos? (matriz, usada
 *    pelo motor para decidir a ordem das paradas);
 *  - por quais ruas passa o trecho escolhido? (traçado, desenhado no mapa).
 *
 * Rede falha: o servidor público é de demonstração e pode ficar fora do ar. Por
 * isso nenhuma função aqui lança erro. Sem resposta, devolvem null e o
 * serviço segue com a estimativa em linha reta. Depois de uma falha o cliente
 * para de insistir por um tempo, para não somar o prazo de espera a cada
 * roteiro pedido enquanto o servidor está fora.
 */

import { env } from '@/config/env.js';
import { logger } from '@/lib/logger.js';
import type { Coordenada } from '@/core/geo.js';
import { criarMedidor, type MatrizDeRotas, type MedidorDeRotas } from '@/core/medidor.js';

/** [latitude, longitude], a ordem que o Leaflet usa. */
export type Tracado = [number, number][];
export type PerfilDeRota = 'pe' | 'carro';

export interface OpcoesCliente {
  urlCarro: string;
  urlAPe: string;
  timeoutMs: number;
  /** Quanto tempo sem tentar de novo depois de uma falha. */
  pausaAposFalhaMs?: number;
  fetchFn?: typeof fetch;
  agora?: () => number;
}

/** Identificação exigida pela política de uso dos servidores do OpenStreetMap. */
const USER_AGENT = 'RotaFacil-TCC/0.3 (prototipo academico)';
/** Os servidores públicos aceitam até 100 coordenadas por matriz. */
const MAX_PONTOS_POR_MATRIZ = 100;
const MAX_PONTOS_NO_TRACADO = 250;

const emGraus = (valor: number) => Math.round(valor * 1e5) / 1e5;

/** Reduz o traçado mantendo o primeiro e o último ponto. */
export function simplificarTracado(pontos: Tracado, maximo = MAX_PONTOS_NO_TRACADO): Tracado {
  if (pontos.length <= maximo) return pontos;
  const passo = (pontos.length - 1) / (maximo - 1);
  const resultado: Tracado = [];
  for (let i = 0; i < maximo; i += 1) resultado.push(pontos[Math.round(i * passo)]!);
  return resultado;
}

function matrizValida(valor: unknown, n: number): valor is (number | null)[][] {
  return (
    Array.isArray(valor) &&
    valor.length === n &&
    valor.every(
      (linha) =>
        Array.isArray(linha) &&
        linha.length === n &&
        linha.every((x) => x === null || typeof x === 'number'),
    )
  );
}

export function criarClienteDeRotas(opcoes: OpcoesCliente) {
  const chamar = opcoes.fetchFn ?? fetch;
  const agora = opcoes.agora ?? Date.now;
  const pausa = opcoes.pausaAposFalhaMs ?? 60_000;
  const base = (perfil: PerfilDeRota) => (perfil === 'pe' ? opcoes.urlAPe : opcoes.urlCarro);

  /** Instante até o qual cada servidor fica sem ser consultado. */
  const emPausaAte: Record<PerfilDeRota, number> = { pe: 0, carro: 0 };

  async function buscar(perfil: PerfilDeRota, caminho: string): Promise<unknown | null> {
    if (agora() < emPausaAte[perfil]) return null;

    try {
      // O nome do perfil no caminho é ignorado pelo OSRM: quem decide é o
      // mapa que o servidor carregou. Por isso é sempre "driving".
      const resposta = await chamar(`${base(perfil).replace(/\/$/, '')}${caminho}`, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(opcoes.timeoutMs),
      });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

      const corpo = (await resposta.json()) as { code?: string };
      if (corpo.code !== 'Ok') throw new Error(`OSRM respondeu ${corpo.code ?? 'sem código'}`);
      return corpo;
    } catch (erro) {
      emPausaAte[perfil] = agora() + pausa;
      logger.warn(
        { perfil, erro: erro instanceof Error ? erro.message : String(erro) },
        'servidor de rotas indisponível; usando estimativa em linha reta',
      );
      return null;
    }
  }

  const coordenadas = (pontos: Coordenada[]) =>
    pontos.map((p) => `${p.lng},${p.lat}`).join(';');

  async function matriz(perfil: PerfilDeRota, pontos: Coordenada[]): Promise<MatrizDeRotas | null> {
    const corpo = (await buscar(
      perfil,
      `/table/v1/driving/${coordenadas(pontos)}?annotations=distance,duration`,
    )) as { distances?: unknown; durations?: unknown } | null;
    if (!corpo) return null;

    if (!matrizValida(corpo.distances, pontos.length) || !matrizValida(corpo.durations, pontos.length)) {
      logger.warn({ perfil }, 'matriz de rotas em formato inesperado');
      return null;
    }
    return { distanciasM: corpo.distances, duracoesS: corpo.durations };
  }

  return {
    /**
     * Mede todos os pares de pontos, a pé e de carro. Devolve null se nenhum
     * dos dois servidores respondeu; se só um respondeu, o outro modal usa a
     * estimativa.
     */
    async medirTudo(pontos: Coordenada[]): Promise<MedidorDeRotas | null> {
      if (pontos.length < 2 || pontos.length > MAX_PONTOS_POR_MATRIZ) return null;

      const [aPe, deCarro] = await Promise.all([matriz('pe', pontos), matriz('carro', pontos)]);
      if (!aPe && !deCarro) return null;
      return criarMedidor(pontos, aPe, deCarro);
    },

    /** Ruas por onde passa um trecho, ou null se o servidor não respondeu. */
    async tracar(perfil: PerfilDeRota, de: Coordenada, para: Coordenada): Promise<Tracado | null> {
      const corpo = (await buscar(
        perfil,
        `/route/v1/driving/${coordenadas([de, para])}?overview=full&geometries=geojson`,
      )) as { routes?: { geometry?: { coordinates?: [number, number][] } }[] } | null;

      const linha = corpo?.routes?.[0]?.geometry?.coordinates;
      if (!linha || linha.length < 2) return null;

      return simplificarTracado(linha.map(([lng, lat]) => [emGraus(lat), emGraus(lng)]));
    },
  };
}

export type ClienteDeRotas = ReturnType<typeof criarClienteDeRotas>;

/** Cliente da aplicação, ou null quando as rotas pelas ruas estão desligadas. */
export const clienteDeRotas: ClienteDeRotas | null = env.ROTAS_PELAS_RUAS
  ? criarClienteDeRotas({
      urlCarro: env.OSRM_URL_CARRO,
      urlAPe: env.OSRM_URL_A_PE,
      timeoutMs: env.OSRM_TIMEOUT_MS,
    })
  : null;
