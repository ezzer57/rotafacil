/**
 * Motor de roteirização (seção 3.5 do TCC).
 *
 * O problema é uma variação do Orienteering Problem com janelas de tempo e
 * restrição de orçamento: há mais atrativos do que cabe no dia, então é
 * preciso ESCOLHER quais visitar, e não apenas ordenar. Como o problema é
 * NP-difícil, usa-se heurística construtiva de inserção gulosa.
 *
 * Código puro: recebe candidatos e preferências, devolve o roteiro. Não
 * conhece banco, HTTP nem Prisma.
 */

import { distanciaViaria, type Coordenada } from './geo.js';
import {
  emReais,
  estimarTrechoPorAplicativo,
  faixaAplicativo,
  custoTaxi,
  type Bandeira,
  type FaixaCusto,
  type MemoriaDeCalculo,
  type ParametrosTarifa,
} from './tarifa.js';

export type Categoria =
  | 'cultura'
  | 'natureza'
  | 'gastronomia'
  | 'compras'
  | 'vidaNoturna'
  | 'religioso';

export type Modal = 'pe' | 'app';
export type MotivoDescarte = 'orcamento' | 'tempo' | 'horario';

export interface Candidato {
  id: string;
  nome: string;
  categoria: Categoria;
  coordenada: Coordenada;
  nota: number | null;
  avaliacoes: number;
  faixaPreco: number | null;
  tempoVisitaMin: number;
  /** Janela de funcionamento em minutos desde a meia-noite. */
  abreMin: number | null;
  fechaMin: number | null;
}

export interface Preferencias {
  origem: Coordenada;
  categorias: Categoria[];
  orcamento: number;
  tempoDisponivelMin: number;
  inicioPrevisto: Date;
}

export interface Trecho {
  modal: Modal;
  distanciaKm: number;
  duracaoMin: number;
  bandeira: Bandeira | null;
  custo: FaixaCusto;
  calculo: MemoriaDeCalculo | null;
}

export interface ItemRoteiro {
  ordem: number;
  candidato: Candidato;
  chegadaPrevista: Date;
  saidaPrevista: Date;
  trechoAteAqui: Trecho;
  custoNoLocal: number;
}

export interface Descartado {
  candidato: Candidato;
  motivo: MotivoDescarte;
  detalhe: string;
}

export interface ResultadoRoteiro {
  itens: ItemRoteiro[];
  descartados: Descartado[];
  totais: {
    custoTransporte: FaixaCusto;
    custoLocais: number;
    duracaoMin: number;
    distanciaKm: number;
    trechosAPe: number;
    economiaCaminhando: number;
  };
  diagnostico: {
    candidatosAvaliados: number;
    trechosCalculados: number;
    duracaoMs: number;
  };
}

/** Acima desta distância o deslocamento deixa de ser a pé. */
export const DISTANCIA_MAX_A_PE_KM = 1;
const VELOCIDADE_A_PE_KMH = 4.5;
const VELOCIDADE_CARRO_KMH = 28;
/** Parcela da duração considerada em trânsito lento, para a hora parada. */
const PROPORCAO_TRANSITO_LENTO = 0.2;
/** Peso aplicado a pontos fora das categorias escolhidas pelo usuário. */
const PESO_FORA_DA_PREFERENCIA = 0.25;

/** Custo estimado dentro do local, a partir da faixa de preço do provedor. */
export function custoNoLocal(candidato: Candidato): number {
  if (candidato.faixaPreco == null) return 0;
  return [0, 20, 45, 90, 160][candidato.faixaPreco] ?? 0;
}

const minutosDoDia = (data: Date) => data.getHours() * 60 + data.getMinutes();

/** O ponto precisa estar aberto na chegada e permanecer até o fim da visita. */
export function cabeNaJanela(
  candidato: Candidato,
  partida: Date,
  duracaoTrechoMin: number,
): boolean {
  if (candidato.abreMin == null || candidato.fechaMin == null) return true;
  const chegada = minutosDoDia(partida) + duracaoTrechoMin;
  return (
    chegada >= candidato.abreMin && chegada + candidato.tempoVisitaMin <= candidato.fechaMin
  );
}

/**
 * Pontuação do ponto (equação 6): média bayesiana ponderada pela preferência.
 * Usar a nota crua favoreceria um lugar com nota 5 e três avaliações; a média
 * bayesiana puxa quem tem poucas avaliações na direção da média geral.
 */
export function pontuar(candidato: Candidato, universo: Candidato[], peso: number): number {
  const notas = universo.map((c) => c.nota ?? 0);
  const mediaGeral = notas.reduce((s, n) => s + n, 0) / Math.max(1, notas.length);
  const avaliacoesOrdenadas = universo.map((c) => c.avaliacoes).sort((a, b) => a - b);
  const confianca = avaliacoesOrdenadas[Math.floor(universo.length / 2)] ?? 1;

  const n = candidato.avaliacoes;
  const r = candidato.nota ?? mediaGeral;
  return peso * ((n * r + confianca * mediaGeral) / (n + confianca || 1));
}

function montarTrecho(
  origem: Coordenada,
  destino: Coordenada,
  partida: Date,
  tarifa: ParametrosTarifa,
): Trecho {
  const distanciaKm = Number(distanciaViaria(origem, destino).toFixed(2));
  const aPe = distanciaKm <= DISTANCIA_MAX_A_PE_KM;
  const duracaoMin = Math.round(
    (distanciaKm / (aPe ? VELOCIDADE_A_PE_KMH : VELOCIDADE_CARRO_KMH)) * 60,
  );

  if (aPe) {
    return {
      modal: 'pe',
      distanciaKm,
      duracaoMin,
      bandeira: null,
      custo: { min: 0, estimado: 0, max: 0 },
      calculo: null,
    };
  }

  const minutosLentos = Number((duracaoMin * PROPORCAO_TRANSITO_LENTO).toFixed(1));
  const { bandeira, custo, calculo } = estimarTrechoPorAplicativo(
    distanciaKm,
    minutosLentos,
    partida,
    tarifa,
  );

  return { modal: 'app', distanciaKm, duracaoMin, bandeira, custo, calculo };
}

/**
 * Gera o roteiro por inserção gulosa: a cada passo entra o ponto com a melhor
 * razão entre benefício (pontuação) e consumo de tempo e dinheiro, desde que
 * caiba nas três restrições. Para quando nenhum candidato restante é viável.
 */
export function gerarRoteiro(
  candidatos: Candidato[],
  preferencias: Preferencias,
  tarifa: ParametrosTarifa,
): ResultadoRoteiro {
  const inicio = performance.now();
  let trechosCalculados = 0;

  const selecionados: Candidato[] = [];
  const restantes = [...candidatos];

  let posicao = preferencias.origem;
  let relogio = new Date(preferencias.inicioPrevisto);
  let gasto = 0;
  let tempo = 0;

  while (restantes.length > 0) {
    let melhor: { candidato: Candidato; trecho: Trecho; razao: number } | null = null;

    for (const candidato of restantes) {
      const dentroDaPreferencia =
        preferencias.categorias.length === 0 ||
        preferencias.categorias.includes(candidato.categoria);
      const peso = dentroDaPreferencia ? 1 : PESO_FORA_DA_PREFERENCIA;

      const trecho = montarTrecho(posicao, candidato.coordenada, relogio, tarifa);
      trechosCalculados += 1;

      const deltaTempo = trecho.duracaoMin + candidato.tempoVisitaMin;
      const deltaCusto = trecho.custo.estimado + custoNoLocal(candidato);

      if (tempo + deltaTempo > preferencias.tempoDisponivelMin) continue;
      if (gasto + deltaCusto > preferencias.orcamento) continue;
      if (!cabeNaJanela(candidato, relogio, trecho.duracaoMin)) continue;

      const razao =
        pontuar(candidato, candidatos, peso) /
        (deltaTempo / preferencias.tempoDisponivelMin +
          deltaCusto / Math.max(1, preferencias.orcamento));

      if (!melhor || razao > melhor.razao) melhor = { candidato, trecho, razao };
    }

    if (!melhor) break;

    selecionados.push(melhor.candidato);
    gasto += melhor.trecho.custo.estimado + custoNoLocal(melhor.candidato);
    tempo += melhor.trecho.duracaoMin + melhor.candidato.tempoVisitaMin;
    relogio = new Date(
      relogio.getTime() +
        (melhor.trecho.duracaoMin + melhor.candidato.tempoVisitaMin) * 60_000,
    );
    posicao = melhor.candidato.coordenada;
    restantes.splice(restantes.indexOf(melhor.candidato), 1);
  }

  // Explica por que cada candidato restante ficou de fora.
  const descartados: Descartado[] = restantes.map((candidato) => {
    const trecho = montarTrecho(posicao, candidato.coordenada, relogio, tarifa);
    const faltaOrcamento =
      gasto + trecho.custo.estimado + custoNoLocal(candidato) - preferencias.orcamento;
    const faltaTempo =
      tempo + trecho.duracaoMin + candidato.tempoVisitaMin - preferencias.tempoDisponivelMin;

    if (faltaOrcamento > 0) {
      return {
        candidato,
        motivo: 'orcamento' as const,
        detalhe: `faltariam R$ ${emReais(faltaOrcamento).toFixed(2).replace('.', ',')}`,
      };
    }
    if (faltaTempo > 0) {
      return {
        candidato,
        motivo: 'tempo' as const,
        detalhe: `precisaria de mais ${Math.ceil(faltaTempo)} min`,
      };
    }
    return {
      candidato,
      motivo: 'horario' as const,
      detalhe: 'fora do horário de funcionamento na hora prevista',
    };
  });

  // Monta os itens finais, já com horários definitivos.
  let cursor = new Date(preferencias.inicioPrevisto);
  let anterior = preferencias.origem;

  const itens: ItemRoteiro[] = selecionados.map((candidato, indice) => {
    const trecho = montarTrecho(anterior, candidato.coordenada, cursor, tarifa);
    const chegada = new Date(cursor.getTime() + trecho.duracaoMin * 60_000);
    const saida = new Date(chegada.getTime() + candidato.tempoVisitaMin * 60_000);
    cursor = saida;
    anterior = candidato.coordenada;

    return {
      ordem: indice + 1,
      candidato,
      chegadaPrevista: chegada,
      saidaPrevista: saida,
      trechoAteAqui: trecho,
      custoNoLocal: custoNoLocal(candidato),
    };
  });

  const somar = (f: (t: Trecho) => number) =>
    itens.reduce((soma, item) => soma + f(item.trechoAteAqui), 0);

  const custoTransporte: FaixaCusto = {
    min: emReais(somar((t) => t.custo.min)),
    estimado: emReais(somar((t) => t.custo.estimado)),
    max: emReais(somar((t) => t.custo.max)),
  };

  const trechosAPe = itens.filter((i) => i.trechoAteAqui.modal === 'pe');
  // Quanto custaria se cada trecho a pé fosse feito de carro de aplicativo.
  const economiaCaminhando = emReais(
    trechosAPe.reduce(
      (soma, item) =>
        soma +
        faixaAplicativo(custoTaxi(item.trechoAteAqui.distanciaKm, 0, 1, tarifa), tarifa)
          .estimado,
      0,
    ),
  );

  return {
    itens,
    descartados,
    totais: {
      custoTransporte,
      custoLocais: emReais(itens.reduce((s, i) => s + i.custoNoLocal, 0)),
      duracaoMin: itens.reduce(
        (s, i) => s + i.trechoAteAqui.duracaoMin + i.candidato.tempoVisitaMin,
        0,
      ),
      distanciaKm: Number(somar((t) => t.distanciaKm).toFixed(1)),
      trechosAPe: trechosAPe.length,
      economiaCaminhando,
    },
    diagnostico: {
      candidatosAvaliados: candidatos.length,
      trechosCalculados,
      duracaoMs: Number((performance.now() - inicio).toFixed(1)),
    },
  };
}
