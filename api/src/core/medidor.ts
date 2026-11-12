/**
 * Medidas de deslocamento pelas ruas.
 *
 * O motor precisa da distância e do tempo entre qualquer par de pontos, muitas
 * vezes por roteiro. Consultar um servidor de rotas a cada par seria lento
 * demais, então o serviço pede UMA matriz com todos os pontos (origem e
 * candidatos) e entrega ao motor este medidor, que só consulta a matriz.
 *
 * Código puro: não conhece rede nem banco. Quem fala com o servidor de rotas
 * está em src/lib/rotas.ts.
 */

import { haversine, type Coordenada } from './geo.js';

export interface Medida {
  distanciaKm: number;
  /** Fracionária: quem usa decide o arredondamento. */
  duracaoMin: number;
}

export interface MedidorDeRotas {
  /** Caminho a pé entre dois pontos, ou null quando não há medida confiável. */
  aPe(a: Coordenada, b: Coordenada): Medida | null;
  /** Caminho de carro entre dois pontos, ou null quando não há medida confiável. */
  deCarro(a: Coordenada, b: Coordenada): Medida | null;
}

/** Matriz devolvida pelo servidor: linha = origem, coluna = destino. */
export interface MatrizDeRotas {
  distanciasM: (number | null)[][];
  duracoesS: (number | null)[][];
}

const chave = (c: Coordenada) => `${c.lat},${c.lng}`;

/**
 * Dois pontos distintos que o servidor "gruda" na mesma rua voltam com
 * distância zero. Abaixo deste limite, apesar de a linha reta ser maior, a
 * medida não é confiável e o motor usa a estimativa.
 */
const DISTANCIA_MINIMA_CONFIAVEL_KM = 0.01;
const LINHA_RETA_SUSPEITA_KM = 0.05;

function consultar(
  indice: Map<string, number>,
  matriz: MatrizDeRotas | null,
  a: Coordenada,
  b: Coordenada,
): Medida | null {
  if (!matriz) return null;
  const i = indice.get(chave(a));
  const j = indice.get(chave(b));
  if (i === undefined || j === undefined) return null;

  const metros = matriz.distanciasM[i]?.[j];
  const segundos = matriz.duracoesS[i]?.[j];
  if (metros == null || segundos == null) return null;

  const distanciaKm = metros / 1000;
  if (i !== j && distanciaKm < DISTANCIA_MINIMA_CONFIAVEL_KM && haversine(a, b) > LINHA_RETA_SUSPEITA_KM) {
    return null;
  }

  return { distanciaKm, duracaoMin: segundos / 60 };
}

/**
 * Monta o medidor. `pontos` precisa estar na mesma ordem em que foi enviado ao
 * servidor, e uma das matrizes pode faltar (o motor usa a estimativa nela).
 */
export function criarMedidor(
  pontos: Coordenada[],
  aPe: MatrizDeRotas | null,
  deCarro: MatrizDeRotas | null,
): MedidorDeRotas {
  const indice = new Map<string, number>();
  pontos.forEach((ponto, posicao) => {
    if (!indice.has(chave(ponto))) indice.set(chave(ponto), posicao);
  });

  return {
    aPe: (a, b) => consultar(indice, aPe, a, b),
    deCarro: (a, b) => consultar(indice, deCarro, a, b),
  };
}
