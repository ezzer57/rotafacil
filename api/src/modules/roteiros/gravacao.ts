/**
 * Tradução do roteiro calculado para as tabelas do banco.
 *
 * Função pura: recebe o resultado do motor e devolve os dados de gravação. É
 * aqui que dinheiro vira Decimal e a memória de cálculo vira JSON, então fica
 * separada para ser testada sem banco.
 */

import { Prisma } from '@prisma/client';

import type { Coordenada } from '@/core/geo.js';
import type { OrigemDoRecalculo } from '@/core/recalculo.js';
import type { Preferencias, ResultadoRoteiro } from '@/core/roteirizacao.js';
import type { Tracado } from '@/lib/rotas.js';

/** O último "Recalcular daqui": quando, de onde o resto partiu e com quanto tempo. */
export interface Recalculo {
  em: Date;
  origem: Coordenada;
  tempoDisponivelMin: number;
  de: OrigemDoRecalculo;
}

/** As colunas do roteiro que guardam o recálculo. */
interface ColunasDoRecalculo {
  recalculadoEm: Date | null;
  recalculoLat: number | null;
  recalculoLng: number | null;
  recalculoTempoMin: number | null;
  recalculoDe: string | null;
}

/** O recálculo gravado no roteiro; null quando ele nunca foi recalculado. */
export function lerRecalculo(colunas: ColunasDoRecalculo): Recalculo | null {
  const { recalculadoEm, recalculoLat, recalculoLng, recalculoTempoMin, recalculoDe } = colunas;
  if (!recalculadoEm || recalculoLat == null || recalculoLng == null || recalculoTempoMin == null) {
    return null;
  }
  return {
    em: recalculadoEm,
    origem: { lat: recalculoLat, lng: recalculoLng },
    tempoDisponivelMin: recalculoTempoMin,
    de: recalculoDe === 'ultima-parada' || recalculoDe === 'partida' ? recalculoDe : 'posicao',
  };
}

/** O que o usuário pediu, já com a cidade resolvida. */
export interface PedidoDeRoteiro {
  usuarioId: string;
  cidadeId: string;
  /** O pedido original (com o teto em vigor): é o que a tela mostra como pedido. */
  preferencias: Preferencias;
  /** Pontos que o usuário tirou e que o recálculo continua ignorando. */
  excluidos: string[];
  /** Ausente (ou null) enquanto o roteiro não é recalculado. */
  recalculo?: Recalculo | null;
}

export interface RegistroDeRoteiro {
  roteiro: Omit<Prisma.RoteiroUncheckedCreateInput, 'itens' | 'descartados' | 'visitas'>;
  itens: Prisma.RoteiroItemUncheckedCreateWithoutRoteiroInput[];
  descartados: Prisma.RoteiroDescartadoUncheckedCreateWithoutRoteiroInput[];
}

const decimal = (valor: number) => new Prisma.Decimal(valor);
const json = (valor: unknown) =>
  valor == null ? Prisma.JsonNull : (valor as Prisma.InputJsonValue);

/**
 * Monta a gravação. `tracados` tem um traçado (ou null) por parada, na ordem
 * do roteiro, e `partidas`, de onde saiu o trecho até cada parada quando não
 * foi da anterior (null no caso comum).
 */
export function paraGravacao(
  pedido: PedidoDeRoteiro,
  resultado: ResultadoRoteiro,
  tracados: (Tracado | null)[],
  partidas: (Coordenada | null)[] = [],
): RegistroDeRoteiro {
  const { preferencias } = pedido;
  const recalculo = pedido.recalculo ?? null;
  const t = resultado.totais;

  return {
    roteiro: {
      usuarioId: pedido.usuarioId,
      cidadeId: pedido.cidadeId,
      inicioPrevisto: preferencias.inicioPrevisto,
      orcamento: preferencias.orcamento == null ? null : decimal(preferencias.orcamento),
      tempoDisponivelMin: preferencias.tempoDisponivelMin,
      origemLat: preferencias.origem.lat,
      origemLng: preferencias.origem.lng,
      categorias: preferencias.categorias,
      pontosExcluidos: pedido.excluidos,
      recalculadoEm: recalculo?.em ?? null,
      recalculoLat: recalculo?.origem.lat ?? null,
      recalculoLng: recalculo?.origem.lng ?? null,
      recalculoTempoMin: recalculo?.tempoDisponivelMin ?? null,
      recalculoDe: recalculo?.de ?? null,
      custoTransporteMin: decimal(t.custoTransporte.min),
      custoTransporteEst: decimal(t.custoTransporte.estimado),
      custoTransporteMax: decimal(t.custoTransporte.max),
      custoLocais: decimal(t.custoLocais),
      duracaoMin: t.duracaoMin,
      distanciaKm: t.distanciaKm,
      trechosAPe: t.trechosAPe,
      economiaCaminhando: decimal(t.economiaCaminhando),
      diagnostico: resultado.diagnostico as unknown as Prisma.InputJsonValue,
    },

    itens: resultado.itens.map((item, indice) => {
      const trecho = item.trechoAteAqui;
      return {
        pontoId: item.candidato.id,
        ordem: item.ordem,
        chegadaPrevista: item.chegadaPrevista,
        saidaPrevista: item.saidaPrevista,
        custoNoLocal: decimal(item.custoNoLocal),
        modal: trecho.modal,
        distanciaKm: trecho.distanciaKm,
        duracaoMin: trecho.duracaoMin,
        bandeira: trecho.bandeira,
        fonteRota: trecho.fonte,
        trajeto: json(tracados[indice]),
        custoMin: decimal(trecho.custo.min),
        custoEst: decimal(trecho.custo.estimado),
        custoMax: decimal(trecho.custo.max),
        calculo: json(trecho.calculo),
        partidaLat: partidas[indice]?.lat ?? null,
        partidaLng: partidas[indice]?.lng ?? null,
      };
    }),

    descartados: resultado.descartados.map((d) => ({
      pontoId: d.candidato.id,
      motivo: d.motivo,
      detalhe: d.detalhe,
    })),
  };
}
