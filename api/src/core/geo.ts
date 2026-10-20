/**
 * Cálculos geográficos.
 *
 * Código puro: sem banco, sem rede, sem Express. Isso permite testar o
 * comportamento do algoritmo sem subir infraestrutura nenhuma.
 */

export interface Coordenada {
  lat: number;
  lng: number;
}

const RAIO_TERRA_KM = 6371;

/** Distância em linha reta entre duas coordenadas, em quilômetros. */
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
 * Fator de circuidade: aproxima a distância pelas vias a partir da linha
 * reta (BALLOU; RAHARDJA; SAKAI, 2002). É uma estimativa provisória, que
 * sai de cena quando a API de rotas passar a devolver a distância real.
 */
export const FATOR_CIRCUIDADE = 1.3;

export const distanciaViaria = (a: Coordenada, b: Coordenada): number =>
  haversine(a, b) * FATOR_CIRCUIDADE;

/** Caixa envolvente para pré-filtrar pontos no banco antes do cálculo exato. */
export function caixaEnvolvente(centro: Coordenada, raioKm: number) {
  const grausLat = raioKm / 111.32;
  const grausLng = raioKm / (111.32 * Math.cos((centro.lat * Math.PI) / 180));
  return {
    latMin: centro.lat - grausLat,
    latMax: centro.lat + grausLat,
    lngMin: centro.lng - grausLng,
    lngMax: centro.lng + grausLng,
  };
}
