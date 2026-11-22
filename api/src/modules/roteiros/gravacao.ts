/**
 * Tradução do roteiro calculado para as tabelas do banco.
 *
 * Função pura: recebe o resultado do motor e devolve os dados de gravação. É
 * aqui que dinheiro vira Decimal e a memória de cálculo vira JSON, então fica
 * separada para ser testada sem banco.
 */

import { Prisma } from '@prisma/client';

import type { Preferencias, ResultadoRoteiro } from '@/core/roteirizacao.js';
import type { Tracado } from '@/lib/rotas.js';

/** O que o usuário pediu, já com a cidade resolvida. */
export interface PedidoDeRoteiro {
  usuarioId: string;
  cidadeId: string;
  preferencias: Preferencias;
  /** Pontos que o usuário tirou e que o recálculo continua ignorando. */
  excluidos: string[];
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
 * do roteiro.
 */
export function paraGravacao(
  pedido: PedidoDeRoteiro,
  resultado: ResultadoRoteiro,
  tracados: (Tracado | null)[],
): RegistroDeRoteiro {
  const { preferencias } = pedido;
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
      };
    }),

    descartados: resultado.descartados.map((d) => ({
      pontoId: d.candidato.id,
      motivo: d.motivo,
      detalhe: d.detalhe,
    })),
  };
}
