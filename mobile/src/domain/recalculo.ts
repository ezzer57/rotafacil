/**
 * Regras do "Recalcular daqui" na tela: quanto tempo oferecer e como contar
 * o que foi refeito. O cálculo em si é o da API (api/src/core/recalculo.ts).
 */

import { tempoQueSobra } from '@motor/recalculo';

import { formatarDuracao, formatarHora } from './format';
import type { RecalculoRoteiro, Roteiro } from './types';

/** Horas cheias oferecidas além do que sobra do plano. */
export const TEMPOS_DO_RECALCULO = [60, 120, 180, 240];

/** Menos que isso não dá para nenhuma visita: não vira opção. */
const SOBRA_MINIMA_MIN = 30;

/** Sem sobra que valha, a tela já vem marcada com 2 horas. */
const TEMPO_PADRAO_MIN = 120;

export interface OpcaoDeTempo {
  minutos: number;
  rotulo: string;
}

/**
 * As opções do "Quanto tempo ainda tem livre?". Quando o plano ainda tem ao
 * menos 30 minutos, a primeira é o que sobra dele (até a hora em que ele
 * terminaria), e é ela que vem marcada; senão, vêm as horas cheias, com 2h
 * marcadas.
 */
export function opcoesDeTempo(
  roteiro: Roteiro,
  agora: Date = new Date(),
): { opcoes: OpcaoDeTempo[]; padrao: number } {
  const base = roteiro.recalculo
    ? {
        inicio: new Date(roteiro.recalculo.em),
        tempoDisponivelMin: roteiro.recalculo.tempoDisponivelMin,
      }
    : { inicio: new Date(roteiro.inicioPrevisto), tempoDisponivelMin: roteiro.tempoDisponivelMin };

  const sobraExata = tempoQueSobra(base, agora);
  // Em passos de 5 minutos: "2h10", e não "2h13".
  const sobra = Math.floor(sobraExata / 5) * 5;
  const horasCheias = TEMPOS_DO_RECALCULO.map((minutos) => ({
    minutos,
    rotulo: formatarDuracao(minutos),
  }));

  if (sobra < SOBRA_MINIMA_MIN) return { opcoes: horasCheias, padrao: TEMPO_PADRAO_MIN };

  // A hora em que o plano terminaria, sem o arredondamento.
  const fim = new Date(agora.getTime() + sobraExata * 60_000).toISOString();
  return {
    opcoes: [
      { minutos: sobra, rotulo: `Até as ${formatarHora(fim)} (${formatarDuracao(sobra)})` },
      ...horasCheias.filter((opcao) => opcao.minutos !== sobra),
    ],
    padrao: sobra,
  };
}

/** O que a tela diz depois do recálculo: quando, de onde e com quanto tempo. */
export function descreverRecalculo(recalculo: RecalculoRoteiro): string {
  const quando = `Refeito às ${formatarHora(recalculo.em)}`;
  const tempo = `com ${formatarDuracao(recalculo.tempoDisponivelMin)} livres`;
  switch (recalculo.de) {
    case 'posicao':
      return `${quando}, a partir de onde você estava, ${tempo}.`;
    case 'ultima-parada':
      return `${quando} sem a sua localização: o resto saiu da última parada em que você chegou, ${tempo}.`;
    case 'partida':
      return `${quando} sem a sua localização: o resto saiu do ponto de partida do roteiro, ${tempo}.`;
  }
}
