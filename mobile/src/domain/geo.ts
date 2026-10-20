/**
 * Cálculos geográficos compartilhados.
 *
 * Ficam no domínio porque são usados tanto pela interface (descobrir em que
 * cidade o usuário está) quanto pelo motor de roteirização (estimar
 * distâncias). Nada aqui depende de React nem de rede.
 */

import type { Cidade, Coordenada } from './types';

/** Raio médio da Terra, em quilômetros. */
const RAIO_TERRA_KM = 6371;

/**
 * Distância em linha reta entre duas coordenadas, em quilômetros
 * (fórmula de haversine, sobre o elipsoide WGS84 usado pelo GPS).
 */
export function haversine(a: Coordenada, b: Coordenada): number {
  const rad = (graus: number) => (graus * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(h));
}

/**
 * Fator de circuidade: converte a linha reta na distância aproximada pelas
 * vias. Sai de cena quando a Routes API entrar e passar a devolver a
 * distância viária real.
 */
export const FATOR_CIRCUIDADE = 1.3;

export const distanciaViaria = (a: Coordenada, b: Coordenada) =>
  haversine(a, b) * FATOR_CIRCUIDADE;

/** Distância máxima, em km, para considerar que o usuário está na cidade. */
export const RAIO_COBERTURA_CIDADE_KM = 60;

export interface CidadeDetectada {
  cidade: Cidade;
  distanciaKm: number;
  /** Falso quando a cidade mais próxima ainda está longe demais. */
  dentroDaCobertura: boolean;
}

/**
 * Descobre em qual das cidades atendidas o usuário está, pela menor
 * distância até o centro de cada uma.
 */
export function cidadeMaisProxima(
  posicao: Coordenada,
  cidades: Cidade[],
): CidadeDetectada | null {
  if (cidades.length === 0) return null;

  const ordenadas = cidades
    .map((cidade) => ({ cidade, distanciaKm: haversine(posicao, cidade.centro) }))
    .sort((a, b) => a.distanciaKm - b.distanciaKm);

  const maisProxima = ordenadas[0];
  return {
    ...maisProxima,
    dentroDaCobertura: maisProxima.distanciaKm <= RAIO_COBERTURA_CIDADE_KM,
  };
}
