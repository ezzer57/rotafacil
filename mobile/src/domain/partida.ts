/**
 * De onde o roteiro parte: da posição do GPS, de um ponto tocado no mapa ou
 * do centro da cidade.
 *
 * Regras, em ordem:
 * 1. um ponto tocado no mapa vale sobre tudo;
 * 2. a posição do GPS só vale dentro de uma cidade atendida, e na cidade
 *    escolhida: partir de centenas de quilômetros dos pontos daria um
 *    roteiro sem sentido;
 * 3. no resto, o roteiro parte do centro da cidade.
 *
 * Sem cidade escolhida, vale a cidade onde o GPS diz que a pessoa está.
 */

import { RAIO_COBERTURA_CIDADE_KM, cidadeMaisProxima, haversine } from './geo';
import type { Cidade, Coordenada } from './types';

export type ModoPartida = 'gps' | 'manual' | 'centro';

/** Cidade usada quando nada indica outra. */
const CIDADE_PADRAO = 'quixada';

interface Entrada {
  cidades: Cidade[] | undefined;
  /** Cidade que o usuário tocou; null enquanto ele não escolhe. */
  cidadeEscolhida: string | null;
  /** Posição do GPS, quando há leitura válida. */
  posicao: Coordenada | null;
  /** Ponto que o usuário tocou no mapa. */
  partidaManual: Coordenada | null;
  /** O usuário tocou em "Centro da cidade". */
  preferirCentro: boolean;
}

export interface Partida {
  cidade: Cidade | undefined;
  /** Cidade atendida mais próxima do GPS, com a distância. */
  detectada: ReturnType<typeof cidadeMaisProxima> | null;
  /** A posição do GPS cai na cidade escolhida. */
  gpsNaCidade: boolean;
  modo: ModoPartida;
  origem: Coordenada | undefined;
  /** A partida fica além do raio que a API aceita. */
  longeDemais: boolean;
}

export function decidirPartida({
  cidades,
  cidadeEscolhida,
  posicao,
  partidaManual,
  preferirCentro,
}: Entrada): Partida {
  const detectada = posicao && cidades?.length ? cidadeMaisProxima(posicao, cidades) : null;

  const cidadeId =
    cidadeEscolhida ?? (detectada?.dentroDaCobertura ? detectada.cidade.id : CIDADE_PADRAO);
  const cidade = cidades?.find((c) => c.id === cidadeId) ?? cidades?.[0];

  const gpsNaCidade =
    posicao != null && detectada?.dentroDaCobertura === true && detectada.cidade.id === cidade?.id;

  const modo: ModoPartida = partidaManual
    ? 'manual'
    : gpsNaCidade && !preferirCentro
      ? 'gps'
      : 'centro';

  const origem = partidaManual ?? (modo === 'gps' && posicao ? posicao : cidade?.centro);

  const longeDemais =
    cidade != null && origem != null && haversine(origem, cidade.centro) > RAIO_COBERTURA_CIDADE_KM;

  return { cidade, detectada, gpsNaCidade, modo, origem, longeDemais };
}
