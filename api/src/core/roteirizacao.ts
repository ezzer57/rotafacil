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
import type { MedidorDeRotas } from './medidor.js';
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
  /** Quanto o lugar é imperdível, de 1 a 5 (curadoria; vale igual em toda cidade). */
  relevancia: number;
  /** Janela de funcionamento em minutos desde a meia-noite. */
  abreMin: number | null;
  fechaMin: number | null;
}

export interface Preferencias {
  origem: Coordenada;
  categorias: Categoria[];
  /** Teto de gasto do dia; null quando o usuário não define limite. */
  orcamento: number | null;
  tempoDisponivelMin: number;
  inicioPrevisto: Date;
}

/** De onde vieram a distância e o tempo do trecho. */
export type FonteDaMedida = 'ruas' | 'estimada';

export interface Trecho {
  modal: Modal;
  /** "ruas": medido no mapa; "estimada": linha reta vezes o fator de circuidade. */
  fonte: FonteDaMedida;
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
    /** Quantos trechos do roteiro final foram medidos pelas ruas. */
    rotas: 'ruas' | 'parcial' | 'estimada';
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

/**
 * Régua que pesa o custo quando o usuário não define teto de gasto. Sem ela,
 * o custo sairia da conta e o algoritmo deixaria de preferir caminhadas e
 * lugares mais baratos. Vale o antigo valor padrão do aplicativo (R$ 80).
 */
export const ORCAMENTO_DE_REFERENCIA = 80;

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

/** Valor de todos os pontos quando nenhum candidato tem nota. */
const NOTA_NEUTRA = 3;

const temNota = (c: Candidato): c is Candidato & { nota: number } =>
  c.nota != null && c.avaliacoes > 0;

/**
 * Pontuação do ponto (equação 6): média bayesiana ponderada pela preferência.
 * Usar a nota crua favoreceria um lugar com nota 5 e três avaliações; a média
 * bayesiana puxa quem tem poucas avaliações na direção da média geral.
 *
 * Ponto sem nota vale a média dos que têm: não é favorecido nem punido. Só
 * quem tem nota entra na média e na confiança, porque contar a falta de nota
 * como zero derrubaria a média sem motivo.
 */
export function pontuar(candidato: Candidato, universo: Candidato[], peso: number): number {
  const avaliados = universo.filter(temNota);
  if (avaliados.length === 0) return peso * NOTA_NEUTRA;

  const mediaGeral = avaliados.reduce((soma, c) => soma + c.nota, 0) / avaliados.length;
  if (!temNota(candidato)) return peso * mediaGeral;

  const avaliacoesOrdenadas = avaliados.map((c) => c.avaliacoes).sort((a, b) => a - b);
  const confianca = avaliacoesOrdenadas[Math.floor(avaliados.length / 2)]!;

  const n = candidato.avaliacoes;
  return peso * ((n * candidato.nota + confianca * mediaGeral) / (n + confianca));
}

/**
 * Mede o deslocamento entre dois pontos. Com o medidor, usa a distância pelas
 * ruas (a pé até DISTANCIA_MAX_A_PE_KM, de carro acima disso); sem ele, ou
 * quando ele não tem a medida, cai na estimativa por linha reta.
 */
/** Peso da relevância no benefício do ponto; o restante vem da nota. */
const PESO_RELEVANCIA = 0.7;

/**
 * A relevância entra elevada ao cubo (na escala de 0 a 5): o símbolo da cidade
 * (5) vale cerca de 4,6 vezes um ponto de relevância 3, e não 1,7 vez. Sem
 * isso, a razão entre benefício e consumo de tempo favorece quem está perto e
 * visita rápido, e um roteiro de 4 horas ficaria só no centro, deixando de fora
 * justamente o que a pessoa foi ver.
 */
const EXPOENTE_RELEVANCIA = 3;
const relevanciaEfetiva = (relevancia: number) => 5 * (relevancia / 5) ** EXPOENTE_RELEVANCIA;

/**
 * Benefício do ponto para o algoritmo: mistura a relevância (curadoria, de 1 a
 * 5, existe para todo ponto) com a nota das avaliações (média bayesiana, que
 * pode faltar), ponderada pela preferência de categoria do usuário.
 *
 * Sem a relevância, o benefício dependia só da nota, e pontos sem avaliação
 * valiam a média: um café e o cartão-postal da cidade empatavam.
 */
export function beneficio(candidato: Candidato, universo: Candidato[], peso: number): number {
  const nota = pontuar(candidato, universo, 1);
  return peso * (PESO_RELEVANCIA * relevanciaEfetiva(candidato.relevancia) + (1 - PESO_RELEVANCIA) * nota);
}

function montarTrecho(
  origem: Coordenada,
  destino: Coordenada,
  partida: Date,
  tarifa: ParametrosTarifa,
  medidor?: MedidorDeRotas,
): Trecho {
  const estimada = distanciaViaria(origem, destino);
  const aPePelasRuas = medidor?.aPe(origem, destino) ?? null;
  const deCarroPelasRuas = medidor?.deCarro(origem, destino) ?? null;

  // O modal sai da distância mais confiável que houver.
  const aPe = (aPePelasRuas?.distanciaKm ?? deCarroPelasRuas?.distanciaKm ?? estimada) <=
    DISTANCIA_MAX_A_PE_KM;

  const medida = aPe ? aPePelasRuas : deCarroPelasRuas;
  const fonte: FonteDaMedida = medida ? 'ruas' : 'estimada';

  const distanciaKm = Number((medida?.distanciaKm ?? estimada).toFixed(2));
  const duracaoMin = Math.max(
    1,
    Math.round(
      medida?.duracaoMin ??
        (estimada / (aPe ? VELOCIDADE_A_PE_KMH : VELOCIDADE_CARRO_KMH)) * 60,
    ),
  );

  if (aPe) {
    return {
      modal: 'pe',
      fonte,
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

  return { modal: 'app', fonte, distanciaKm, duracaoMin, bandeira, custo, calculo };
}

/**
 * Gera o roteiro por inserção gulosa: a cada passo entra o ponto com a melhor
 * razão entre benefício (pontuação) e consumo de tempo e dinheiro, desde que
 * caiba no tempo, no horário de funcionamento e, quando há teto, no orçamento.
 * Para quando nenhum candidato restante é viável.
 */
export function gerarRoteiro(
  candidatos: Candidato[],
  preferencias: Preferencias,
  tarifa: ParametrosTarifa,
  medidor?: MedidorDeRotas,
): ResultadoRoteiro {
  const inicio = performance.now();
  let trechosCalculados = 0;

  const teto = preferencias.orcamento;
  const regua = teto ?? ORCAMENTO_DE_REFERENCIA;

  const selecionados: Candidato[] = [];

  interface Estado {
    posicao: Coordenada;
    relogio: Date;
    gasto: number;
    tempo: number;
  }

  /**
   * Percorre uma sequência de paradas e diz se ela cabe no tempo, no
   * orçamento e nos horários de funcionamento. Devolve null se não couber.
   */
  const simular = (sequencia: Candidato[]): Estado | null => {
    let estado: Estado = {
      posicao: preferencias.origem,
      relogio: new Date(preferencias.inicioPrevisto),
      gasto: 0,
      tempo: 0,
    };
    for (const candidato of sequencia) {
      const trecho = montarTrecho(estado.posicao, candidato.coordenada, estado.relogio, tarifa, medidor);
      trechosCalculados += 1;
      const deltaTempo = trecho.duracaoMin + candidato.tempoVisitaMin;
      const deltaCusto = trecho.custo.estimado + custoNoLocal(candidato);

      if (estado.tempo + deltaTempo > preferencias.tempoDisponivelMin) return null;
      if (teto != null && estado.gasto + deltaCusto > teto) return null;
      if (!cabeNaJanela(candidato, estado.relogio, trecho.duracaoMin)) return null;

      estado = {
        posicao: candidato.coordenada,
        relogio: new Date(estado.relogio.getTime() + deltaTempo * 60_000),
        gasto: estado.gasto + deltaCusto,
        tempo: estado.tempo + deltaTempo,
      };
    }
    return estado;
  };

  const restantes = [...candidatos];

  /**
   * Inserção gulosa: acrescenta ao fim da rota o melhor candidato que ainda
   * cabe, entre os de relevância igual ou maior que `relevanciaMinima`.
   */
  const ampliar = (relevanciaMinima: number) => {
    for (;;) {
      const estado = simular(selecionados)!;
      let melhor: { candidato: Candidato; razao: number } | null = null;

      for (const candidato of restantes) {
        const dentroDaPreferencia =
          preferencias.categorias.length === 0 ||
          preferencias.categorias.includes(candidato.categoria);
        const peso = dentroDaPreferencia ? 1 : PESO_FORA_DA_PREFERENCIA;

        // Nas fases dos imperdíveis só entra o que o usuário disse querer.
        if (relevanciaMinima > 0 && (!dentroDaPreferencia || candidato.relevancia < relevanciaMinima)) {
          continue;
        }

        const trecho = montarTrecho(estado.posicao, candidato.coordenada, estado.relogio, tarifa, medidor);
        trechosCalculados += 1;

        const deltaTempo = trecho.duracaoMin + candidato.tempoVisitaMin;
        const deltaCusto = trecho.custo.estimado + custoNoLocal(candidato);

        if (estado.tempo + deltaTempo > preferencias.tempoDisponivelMin) continue;
        if (teto != null && estado.gasto + deltaCusto > teto) continue;
        if (!cabeNaJanela(candidato, estado.relogio, trecho.duracaoMin)) continue;

        const razao =
          beneficio(candidato, candidatos, peso) /
          (deltaTempo / preferencias.tempoDisponivelMin + deltaCusto / Math.max(1, regua));

        if (!melhor || razao > melhor.razao) melhor = { candidato, razao };
      }

      if (!melhor) return;
      selecionados.push(melhor.candidato);
      restantes.splice(restantes.indexOf(melhor.candidato), 1);
    }
  };

  /**
   * 2-opt: inverte um trecho da rota quando isso diminui o deslocamento total
   * e a rota continua cabendo no tempo, no orçamento e nos horários. É o que
   * desfaz o zigue-zague que a inserção gulosa deixa (ela escolhe cada parada
   * pelo valor, sem olhar o desenho do percurso).
   *
   * "Menor deslocamento" pesa tempo e dinheiro como a escolha das paradas:
   * pegar um carro para chegar mais rápido ao ponto mais distante não é
   * melhor do que caminhar na ordem, e o custo sai de graça na conta.
   */
  const custoDaRota = (estado: Estado) =>
    estado.tempo / preferencias.tempoDisponivelMin + estado.gasto / Math.max(1, regua);

  const desembaracar = (): boolean => {
    let melhorou = false;
    let atual = simular(selecionados)!;

    for (let rodada = 0; rodada < 20; rodada += 1) {
      let achou = false;
      for (let i = 0; i < selecionados.length - 1 && !achou; i += 1) {
        for (let j = i + 1; j < selecionados.length && !achou; j += 1) {
          const tentativa = [
            ...selecionados.slice(0, i),
            ...selecionados.slice(i, j + 1).reverse(),
            ...selecionados.slice(j + 1),
          ];
          const estado = simular(tentativa);
          // Exige ganho real, para não trocar por ruído de arredondamento.
          if (estado && custoDaRota(estado) < custoDaRota(atual) - 1e-4) {
            selecionados.splice(0, selecionados.length, ...tentativa);
            atual = estado;
            achou = true;
            melhorou = true;
          }
        }
      }
      if (!achou) break;
    }
    return melhorou;
  };

  /**
   * Primeiro os símbolos da cidade (relevância 5), depois os grandes atrativos
   * (4), por fim o que sobrar. A razão entre benefício e tempo, sozinha,
   * favorece o que está perto e se visita rápido, e um roteiro curto ficaria
   * no centro sem ver o que a pessoa foi conhecer. Aqui cada fase só escolhe
   * entre os pontos da sua faixa; o que não cabe no tempo, no orçamento ou no
   * horário continua de fora, como sempre.
   */
  const FASES_DE_RELEVANCIA = [5, 4, 0];
  const completar = () => FASES_DE_RELEVANCIA.forEach(ampliar);

  // Escolhe, desembaraça e, com o tempo que sobrou, escolhe de novo.
  completar();
  for (let rodada = 0; rodada < 5; rodada += 1) {
    if (!desembaracar()) break;
    completar();
  }

  const { posicao, relogio, gasto, tempo } = simular(selecionados)!;

  // Explica por que cada candidato restante ficou de fora.
  const descartados: Descartado[] = restantes.map((candidato) => {
    const trecho = montarTrecho(posicao, candidato.coordenada, relogio, tarifa, medidor);
    const faltaOrcamento =
      teto == null ? 0 : gasto + trecho.custo.estimado + custoNoLocal(candidato) - teto;
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
    const trecho = montarTrecho(anterior, candidato.coordenada, cursor, tarifa, medidor);
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
      rotas:
        itens.length === 0 || itens.every((i) => i.trechoAteAqui.fonte === 'estimada')
          ? 'estimada'
          : itens.every((i) => i.trechoAteAqui.fonte === 'ruas')
            ? 'ruas'
            : 'parcial',
      candidatosAvaliados: candidatos.length,
      trechosCalculados,
      duracaoMs: Number((performance.now() - inicio).toFixed(1)),
    },
  };
}
