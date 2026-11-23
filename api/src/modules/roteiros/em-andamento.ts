/**
 * O roteiro gravado, lido para o recálculo: as paradas em que a pessoa já
 * chegou (no formato do motor, com o que só o banco sabe delas) e a base do
 * plano em vigor.
 */

import type { Prisma } from '@prisma/client';

import type { Coordenada } from '@/core/geo.js';
import type { BaseDoPlano, ParadaFeita } from '@/core/recalculo.js';
import { situacaoNoHorario, type ItemRoteiro, type Modal } from '@/core/roteirizacao.js';
import type { MemoriaDeCalculo } from '@/core/tarifa.js';
import type { Tracado } from '@/lib/rotas.js';
import { lerRecalculo } from './gravacao.js';
import { paraCandidato, type RoteiroGravado } from './repositorio.js';

const numero = (valor: Prisma.Decimal | null) => (valor == null ? 0 : Number(valor));

type ItemGravado = RoteiroGravado['itens'][number];

/** Uma parada feita, com as ruas já traçadas e a partida própria, que são regravadas iguais. */
export interface FeitaGravada extends ParadaFeita {
  trajeto: Tracado | null;
  partida: Coordenada | null;
}

/** A parada gravada no formato do motor. */
function paraItemDoMotor(item: ItemGravado): ItemRoteiro {
  const candidato = paraCandidato(item.ponto);
  return {
    ordem: item.ordem,
    candidato,
    chegadaPrevista: item.chegadaPrevista,
    saidaPrevista: item.saidaPrevista,
    custoNoLocal: numero(item.custoNoLocal),
    situacaoNoHorario: situacaoNoHorario(candidato, item.chegadaPrevista),
    trechoAteAqui: {
      modal: (item.modal ?? 'pe') as Modal,
      fonte: item.fonteRota === 'ruas' ? 'ruas' : 'estimada',
      distanciaKm: item.distanciaKm ?? 0,
      duracaoMin: item.duracaoMin ?? 0,
      bandeira: item.bandeira === 1 || item.bandeira === 2 ? item.bandeira : null,
      custo: {
        min: numero(item.custoMin),
        estimado: numero(item.custoEst),
        max: numero(item.custoMax),
      },
      calculo: (item.calculo as MemoriaDeCalculo | null) ?? null,
    },
  };
}

/** As paradas em que a pessoa já chegou, na ordem do roteiro. */
export function paradasFeitas(roteiro: RoteiroGravado): FeitaGravada[] {
  const visitas = new Map(roteiro.visitas.map((v) => [v.pontoId, v]));
  return [...roteiro.itens]
    .sort((a, b) => a.ordem - b.ordem)
    .flatMap((item) => {
      const visita = visitas.get(item.pontoId);
      if (!visita) return [];
      return [
        {
          item: paraItemDoMotor(item),
          chegadaEm: visita.chegadaEm,
          custoRegistrado: visita.custoRegistrado == null ? null : Number(visita.custoRegistrado),
          trajeto: (item.trajeto as Tracado | null) ?? null,
          partida:
            item.partidaLat != null && item.partidaLng != null
              ? { lat: item.partidaLat, lng: item.partidaLng }
              : null,
        },
      ];
    });
}

/** O plano em vigor: o último "Recalcular daqui" ou, sem ele, o pedido original. */
export function baseDoPlano(roteiro: RoteiroGravado): BaseDoPlano {
  const recalculo = lerRecalculo(roteiro);
  if (recalculo) {
    return {
      origem: recalculo.origem,
      inicio: recalculo.em,
      tempoDisponivelMin: recalculo.tempoDisponivelMin,
      recalculadoEm: recalculo.em,
    };
  }
  return {
    origem: { lat: roteiro.origemLat, lng: roteiro.origemLng },
    inicio: roteiro.inicioPrevisto,
    tempoDisponivelMin: roteiro.tempoDisponivelMin,
    recalculadoEm: null,
  };
}
