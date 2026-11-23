/**
 * Recálculo de um roteiro em andamento (objetivo 7 do TCC): o "Recalcular
 * daqui" e os ajustes (tirar, trocar, mudar o teto) depois de um check-in.
 *
 * As paradas em que a pessoa já chegou ficam como foram planejadas e
 * registradas: ordem, horários, trecho e custo. Só o resto é refeito pelo
 * motor, a partir de uma nova partida, com o tempo e o dinheiro que sobram e
 * sem repetir lugar visitado. Antes, um ajuste refazia o roteiro inteiro e
 * podia tirar dele uma parada em que a pessoa já tinha estado.
 *
 * Código puro, como o motor: a API e o modo de demonstração usam o mesmo.
 */

import type { Coordenada } from './geo.js';
import type { MedidorDeRotas } from './medidor.js';
import {
  gerarRoteiro,
  qualidadeDasRotas,
  somarTotais,
  type Candidato,
  type ItemRoteiro,
  type Preferencias,
  type ResultadoRoteiro,
} from './roteirizacao.js';
import { emReais, type ParametrosTarifa } from './tarifa.js';

/** Uma parada em que a pessoa já chegou. */
export interface ParadaFeita {
  /** A parada como está no roteiro: trecho, horários e custos previstos. */
  item: ItemRoteiro;
  /** Quando a pessoa disse que chegou. */
  chegadaEm: Date;
  /** Quanto pagou na corrida até aqui, quando informou. */
  custoRegistrado: number | null;
}

/** De onde, a partir de quando e com quanto tempo o resto é planejado. */
export interface PartidaDoResto {
  origem: Coordenada;
  inicio: Date;
  tempoDisponivelMin: number;
}

/** O plano em vigor: o pedido original ou o último "Recalcular daqui". */
export interface BaseDoPlano extends PartidaDoResto {
  /** Quando o "Recalcular daqui" foi feito; null no pedido original. */
  recalculadoEm: Date | null;
}

/** De onde o "Recalcular daqui" partiu. */
export type OrigemDoRecalculo = 'posicao' | 'ultima-parada' | 'partida';

/**
 * O que já foi gasto: em cada parada feita, a corrida (o valor pago, quando a
 * pessoa informou; senão, a estimativa) e a entrada do lugar.
 */
export function gastoAteAgora(feitas: ParadaFeita[]): number {
  return emReais(
    feitas.reduce(
      (soma, { item, custoRegistrado }) =>
        soma + (custoRegistrado ?? item.trechoAteAqui.custo.estimado) + item.custoNoLocal,
      0,
    ),
  );
}

/** O teto que sobra para o resto: null quando não há teto, e nunca menos que zero. */
export function orcamentoQueSobra(teto: number | null, feitas: ParadaFeita[]): number | null {
  return teto == null ? null : Math.max(0, emReais(teto - gastoAteAgora(feitas)));
}

/**
 * Minutos que sobram do plano a partir de `momento`, até o fim previsto
 * (início + tempo livre). Nunca negativo, e nunca mais que o tempo do plano:
 * quem recalcula antes da hora de começar não ganha horas a mais.
 */
export function tempoQueSobra(
  base: Pick<PartidaDoResto, 'inicio' | 'tempoDisponivelMin'>,
  momento: Date,
): number {
  const fim = base.inicio.getTime() + base.tempoDisponivelMin * 60_000;
  const sobra = Math.floor((fim - momento.getTime()) / 60_000);
  return Math.max(0, Math.min(base.tempoDisponivelMin, sobra));
}

/**
 * Partida de um ajuste (tirar, trocar, mudar o teto). Sem chegada desde a
 * base do plano, o resto sai da mesma partida de antes. Com chegada, sai da
 * última parada feita, na saída prevista dela, com o tempo que sobra até o
 * fim do plano. `feitas` vem na ordem do roteiro.
 */
export function partidaDoAjuste(base: BaseDoPlano, feitas: ParadaFeita[]): PartidaDoResto {
  const desde = base.recalculadoEm;
  const depoisDaBase = desde ? feitas.filter((f) => f.chegadaEm >= desde) : feitas;
  const ultima = depoisDaBase[depoisDaBase.length - 1];

  if (!ultima) {
    return {
      origem: base.origem,
      inicio: base.inicio,
      tempoDisponivelMin: base.tempoDisponivelMin,
    };
  }
  return {
    origem: ultima.item.candidato.coordenada,
    inicio: ultima.item.saidaPrevista,
    tempoDisponivelMin: tempoQueSobra(base, ultima.item.saidaPrevista),
  };
}

/**
 * De onde o "Recalcular daqui" parte: da posição do aparelho; sem ela, da
 * última parada feita; sem nenhuma, da partida do plano.
 */
export function partidaDoRecalculo(
  posicao: Coordenada | null,
  base: BaseDoPlano,
  feitas: ParadaFeita[],
): { origem: Coordenada; de: OrigemDoRecalculo } {
  if (posicao) return { origem: posicao, de: 'posicao' };
  const ultima = feitas[feitas.length - 1];
  if (ultima) return { origem: ultima.item.candidato.coordenada, de: 'ultima-parada' };
  return { origem: base.origem, de: 'partida' };
}

/**
 * De onde sai o primeiro trecho do resto, quando não é o ponto anterior da
 * lista (a última parada feita ou, sem nenhuma, a partida do roteiro). No
 * "Recalcular daqui" com GPS, é a posição da pessoa; no caso comum, null.
 */
export function partidaPropriaDoResto(
  feitas: ParadaFeita[],
  partidaDoRoteiro: Coordenada,
  origemDoResto: Coordenada,
): Coordenada | null {
  const anterior = feitas[feitas.length - 1]?.item.candidato.coordenada ?? partidaDoRoteiro;
  const mesmoPonto = anterior.lat === origemDoResto.lat && anterior.lng === origemDoResto.lng;
  return mesmoPonto ? null : origemDoResto;
}

/**
 * Refaz o resto do roteiro. As paradas feitas vêm primeiro, na ordem em que
 * estão; depois, as que o motor escolher a partir de `resto` (origem, início,
 * tempo e teto do que falta). Lugar já visitado não volta, e os totais somam
 * as duas partes.
 */
export function refazerORestante(
  feitas: ParadaFeita[],
  candidatos: Candidato[],
  resto: Preferencias,
  tarifa: ParametrosTarifa,
  medidor?: MedidorDeRotas,
): ResultadoRoteiro {
  const visitados = new Set(feitas.map((f) => f.item.candidato.id));
  const novo = gerarRoteiro(
    candidatos.filter((c) => !visitados.has(c.id)),
    resto,
    tarifa,
    medidor,
  );

  const itens: ItemRoteiro[] = [
    ...feitas.map((f, i) => ({ ...f.item, ordem: i + 1 })),
    ...novo.itens.map((item, i) => ({ ...item, ordem: feitas.length + i + 1 })),
  ];

  return {
    itens,
    descartados: novo.descartados,
    totais: somarTotais(itens, tarifa),
    diagnostico: { ...novo.diagnostico, rotas: qualidadeDasRotas(itens) },
  };
}
