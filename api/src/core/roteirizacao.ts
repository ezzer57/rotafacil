/**
 * Motor de roteirização (seção 3.5 do TCC).
 *
 * O problema é uma variação do Orienteering Problem com janelas de tempo e
 * restrição de orçamento: há mais atrativos do que cabe no dia, então é
 * preciso ESCOLHER quais visitar, e não apenas ordenar. Como o problema é
 * NP-difícil, o motor usa heurísticas, em quatro passos:
 *
 * 1. Benefício: cada ponto ganha um valor que mistura a relevância, a nota
 *    das avaliações e a preferência de categoria do usuário (`beneficio`).
 * 2. Escolha: inserção gulosa em fases de relevância (5, depois 4, depois o
 *    resto), pela razão entre benefício e consumo de tempo e dinheiro.
 * 3. Ordem: 2-opt, que desfaz o zigue-zague da escolha. O tempo que sobra
 *    volta para o passo 2.
 * 4. Resultado: horário de cada parada, descartados com o motivo e totais.
 *
 * As horas do dia (horário de funcionamento e bandeira do táxi) são lidas no
 * fuso do processo, que `config/env.ts` fixa em FUSO_HORARIO
 * (America/Fortaleza por padrão).
 *
 * Código puro: recebe candidatos e preferências, devolve o roteiro. Não
 * conhece banco, HTTP nem Prisma.
 */

import { distanciaViaria, type Coordenada } from './geo.js';
import type { MedidorDeRotas } from './medidor.js';
import {
  bandeiraDe,
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
  'cultura' | 'natureza' | 'gastronomia' | 'compras' | 'vidaNoturna' | 'religioso';

export type Modal = 'pe' | 'app';
/** 'horario' só aparece em roteiros antigos: hoje o lugar fechado entra marcado. */
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
  /**
   * Janela de funcionamento em minutos desde a meia-noite. Fechamento antes da
   * abertura é janela que vira o dia; abertura igual ao fechamento, 24 horas.
   */
  abreMin: number | null;
  fechaMin: number | null;
  /**
   * Lugar público ao ar livre (parque, praça, praia, mirante, trilha): nunca
   * fica fora do horário, mesmo que o mapa informe portões.
   */
  arLivre: boolean;
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

/** Como o lugar estará na hora prevista da visita. */
export type SituacaoNoHorario = 'aberto' | 'fechado' | 'fecha-durante-a-visita';

export interface ItemRoteiro {
  ordem: number;
  candidato: Candidato;
  chegadaPrevista: Date;
  saidaPrevista: Date;
  trechoAteAqui: Trecho;
  custoNoLocal: number;
  situacaoNoHorario: SituacaoNoHorario;
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
    /** Trechos distintos medidos; as repetições saem da memória do motor. */
    trechosCalculados: number;
    duracaoMs: number;
  };
}

// ---------------------------------------------------------------------------
// Parâmetros do motor
// ---------------------------------------------------------------------------

/** Acima desta distância o deslocamento deixa de ser a pé e passa a ser de carro. */
export const DISTANCIA_MAX_A_PE_KM = 1;
/** Velocidades da estimativa usada quando não há medida pelas ruas. */
const VELOCIDADE_A_PE_KMH = 4.5;
const VELOCIDADE_CARRO_KMH = 28;
/** Parcela da duração considerada em trânsito lento, para a hora parada. */
const PROPORCAO_TRANSITO_LENTO = 0.2;

/**
 * Régua que pesa o custo quando o usuário não define teto de gasto. Sem ela,
 * o custo sairia da conta e o algoritmo deixaria de preferir caminhadas e
 * lugares mais baratos. Vale o antigo valor padrão do aplicativo (R$ 80).
 */
export const ORCAMENTO_DE_REFERENCIA = 80;

/**
 * Gasto estimado por pessoa dentro do lugar, por faixa de preço: de 0 (grátis)
 * a 4 (muito caro), a escala dos guias de viagem. Os valores em reais são
 * estimativa do autor.
 */
const GASTO_POR_FAIXA_DE_PRECO: readonly number[] = [0, 20, 45, 90, 160];

/** Peso aplicado a pontos fora das categorias escolhidas pelo usuário. */
const PESO_FORA_DA_PREFERENCIA = 0.25;

/** Valor de todos os pontos quando nenhum candidato tem nota. */
const NOTA_NEUTRA = 3;

const RELEVANCIA_MAXIMA = 5;
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

/**
 * Lugar fora do horário não sai do roteiro: entra marcado, para o usuário
 * decidir. Mas vale um quinto de um aberto na escolha, e cada visita fora do
 * horário pesa na comparação de ordens, para o 2-opt não trocar uma visita
 * aberta por uma fechada só para encurtar o caminho.
 */
const FATOR_FORA_DO_HORARIO = 0.2;
const PENALIDADE_FORA_DO_HORARIO = 1;

/**
 * Fases da escolha: primeiro os símbolos da cidade (relevância 5), depois os
 * grandes atrativos (4), por fim qualquer ponto (0). A razão entre benefício e
 * tempo, sozinha, favorece o que está perto e se visita rápido, e um roteiro
 * curto ficaria no centro sem ver o que a pessoa foi conhecer.
 */
const FASES_DE_RELEVANCIA = [5, 4, 0] as const;
/** Quantas vezes, no máximo, o motor alterna entre desembaraçar e escolher de novo. */
const MAX_CICLOS_DE_MELHORIA = 5;
/** Quantas inversões de trecho, no máximo, cada desembaraço aplica. */
const MAX_INVERSOES = 20;
/** Ganho mínimo para aceitar uma inversão; abaixo disso é ruído de arredondamento. */
const GANHO_MINIMO_DA_INVERSAO = 1e-4;

// ---------------------------------------------------------------------------
// Custo no local e horário de funcionamento
// ---------------------------------------------------------------------------

/** Custo estimado dentro do local, a partir da faixa de preço. */
export function custoNoLocal(candidato: Candidato): number {
  if (candidato.faixaPreco == null) return 0;
  return GASTO_POR_FAIXA_DE_PRECO[candidato.faixaPreco] ?? 0;
}

const MINUTOS_NO_DIA = 24 * 60;
const minutosDoDia = (data: Date) => data.getHours() * 60 + data.getMinutes();

/**
 * Situação do lugar na hora da visita: aberto do começo ao fim, fechado na
 * chegada, ou aberto na chegada mas fechando antes do fim da visita.
 *
 * - Lugar ao ar livre e lugar sem horário estão sempre abertos.
 * - Abertura igual ao fechamento é lugar aberto 24 horas.
 * - Fechamento antes da abertura é janela que vira o dia: um bar das 18h às
 *   2h está aberto à 1h e fechado às 3h.
 */
export function situacaoNoHorario(
  lugar: Pick<Candidato, 'abreMin' | 'fechaMin' | 'arLivre' | 'tempoVisitaMin'>,
  chegada: Date,
): SituacaoNoHorario {
  const { abreMin, fechaMin } = lugar;
  if (lugar.arLivre || abreMin == null || fechaMin == null || abreMin === fechaMin) {
    return 'aberto';
  }

  const minuto = minutosDoDia(chegada);

  // Minuto do fechamento, contado da meia-noite do dia da chegada.
  let fechamento: number;
  if (fechaMin > abreMin) {
    if (minuto < abreMin || minuto >= fechaMin) return 'fechado';
    fechamento = fechaMin;
  } else if (minuto >= abreMin) {
    // Abriu hoje e fecha na madrugada seguinte.
    fechamento = fechaMin + MINUTOS_NO_DIA;
  } else if (minuto < fechaMin) {
    // Ainda é a madrugada da janela que abriu ontem.
    fechamento = fechaMin;
  } else {
    return 'fechado';
  }

  return minuto + lugar.tempoVisitaMin > fechamento ? 'fecha-durante-a-visita' : 'aberto';
}

/** O ponto está aberto na chegada e permanece aberto até o fim da visita. */
export function cabeNaJanela(
  candidato: Candidato,
  partida: Date,
  duracaoTrechoMin: number,
): boolean {
  const chegada = new Date(partida.getTime() + duracaoTrechoMin * 60_000);
  return situacaoNoHorario(candidato, chegada) === 'aberto';
}

// ---------------------------------------------------------------------------
// Benefício do ponto
// ---------------------------------------------------------------------------

const temNota = (c: Candidato): c is Candidato & { nota: number } =>
  c.nota != null && c.avaliacoes > 0;

/** Média geral e confiança da média bayesiana; null quando ninguém tem nota. */
interface EstatisticasDasNotas {
  mediaGeral: number;
  /**
   * Mediana do número de avaliações: com ela, um ponto precisa de tantas
   * avaliações quanto o ponto típico para a nota dele pesar tanto quanto a
   * média geral.
   */
  confianca: number;
}

function estatisticasDasNotas(universo: Candidato[]): EstatisticasDasNotas | null {
  const avaliados = universo.filter(temNota);
  if (avaliados.length === 0) return null;

  const mediaGeral = avaliados.reduce((soma, c) => soma + c.nota, 0) / avaliados.length;
  const avaliacoesOrdenadas = avaliados.map((c) => c.avaliacoes).sort((a, b) => a - b);
  const confianca = avaliacoesOrdenadas[Math.floor(avaliados.length / 2)]!;
  return { mediaGeral, confianca };
}

function notaBayesiana(candidato: Candidato, estatisticas: EstatisticasDasNotas | null): number {
  if (!estatisticas) return NOTA_NEUTRA;
  if (!temNota(candidato)) return estatisticas.mediaGeral;

  const { mediaGeral, confianca } = estatisticas;
  const n = candidato.avaliacoes;
  return (n * candidato.nota + confianca * mediaGeral) / (n + confianca);
}

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
  return peso * notaBayesiana(candidato, estatisticasDasNotas(universo));
}

const relevanciaEfetiva = (relevancia: number) =>
  RELEVANCIA_MAXIMA * (relevancia / RELEVANCIA_MAXIMA) ** EXPOENTE_RELEVANCIA;

function beneficioCom(
  candidato: Candidato,
  estatisticas: EstatisticasDasNotas | null,
  peso: number,
): number {
  const nota = notaBayesiana(candidato, estatisticas);
  return (
    peso *
    (PESO_RELEVANCIA * relevanciaEfetiva(candidato.relevancia) + (1 - PESO_RELEVANCIA) * nota)
  );
}

/**
 * Benefício do ponto para o algoritmo: mistura a relevância (curadoria, de 1 a
 * 5, existe para todo ponto) com a nota das avaliações (média bayesiana, que
 * pode faltar), ponderada pela preferência de categoria do usuário.
 *
 * Sem a relevância, o benefício dependia só da nota, e pontos sem avaliação
 * valiam a média: um café e o cartão-postal da cidade empatavam.
 */
export function beneficio(candidato: Candidato, universo: Candidato[], peso: number): number {
  return beneficioCom(candidato, estatisticasDasNotas(universo), peso);
}

// ---------------------------------------------------------------------------
// Trechos
// ---------------------------------------------------------------------------

/**
 * Mede o deslocamento entre dois pontos. Com o medidor, usa a distância pelas
 * ruas (a pé até DISTANCIA_MAX_A_PE_KM, de carro acima disso); sem ele, ou
 * quando ele não tem a medida, cai na estimativa por linha reta.
 */
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
  const aPe =
    (aPePelasRuas?.distanciaKm ?? deCarroPelasRuas?.distanciaKm ?? estimada) <=
    DISTANCIA_MAX_A_PE_KM;

  const medida = aPe ? aPePelasRuas : deCarroPelasRuas;
  const fonte: FonteDaMedida = medida ? 'ruas' : 'estimada';

  const distanciaKm = Number((medida?.distanciaKm ?? estimada).toFixed(2));
  const duracaoMin = Math.max(
    1,
    Math.round(
      medida?.duracaoMin ?? (estimada / (aPe ? VELOCIDADE_A_PE_KMH : VELOCIDADE_CARRO_KMH)) * 60,
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

type MedirTrecho = (origem: Coordenada, destino: Coordenada, partida: Date) => Trecho;

/**
 * Mede trechos guardando cada resultado. A escolha e o 2-opt simulam muitas
 * ordens, e o mesmo par de pontos volta centenas de vezes. O trecho só
 * depende do horário pela bandeira do táxi, então a chave é origem, destino e
 * bandeira.
 */
function criarMedicaoDeTrechos(tarifa: ParametrosTarifa, medidor?: MedidorDeRotas) {
  const guardados = new Map<string, Trecho>();

  const medir: MedirTrecho = (origem, destino, partida) => {
    const chave = `${origem.lat},${origem.lng}>${destino.lat},${destino.lng}#${bandeiraDe(partida)}`;
    let trecho = guardados.get(chave);
    if (!trecho) {
      trecho = montarTrecho(origem, destino, partida, tarifa, medidor);
      guardados.set(chave, trecho);
    }
    return trecho;
  };

  return { medir, calculados: () => guardados.size };
}

// ---------------------------------------------------------------------------
// Geração do roteiro
// ---------------------------------------------------------------------------

/** Onde a pessoa está e quanto já gastou depois de uma sequência de paradas. */
interface Estado {
  posicao: Coordenada;
  relogio: Date;
  gasto: number;
  tempo: number;
  /** Visitas que caem fora do horário de funcionamento do lugar. */
  foraDoHorario: number;
}

/**
 * Gera o roteiro por inserção gulosa: a cada passo entra o ponto com a melhor
 * razão entre benefício e consumo de tempo e dinheiro, desde que caiba no
 * tempo e, quando há teto, no orçamento. Depois o 2-opt reordena, e o tempo
 * que sobrar volta para a escolha.
 */
export function gerarRoteiro(
  candidatos: Candidato[],
  preferencias: Preferencias,
  tarifa: ParametrosTarifa,
  medidor?: MedidorDeRotas,
): ResultadoRoteiro {
  const inicio = performance.now();
  const { medir, calculados } = criarMedicaoDeTrechos(tarifa, medidor);

  const teto = preferencias.orcamento;
  const regua = Math.max(1, teto ?? ORCAMENTO_DE_REFERENCIA);
  const tempoTotal = preferencias.tempoDisponivelMin;

  const dentroDaPreferencia = (c: Candidato) =>
    preferencias.categorias.length === 0 || preferencias.categorias.includes(c.categoria);

  // O benefício não muda durante a busca: calcula uma vez por ponto.
  const estatisticas = estatisticasDasNotas(candidatos);
  const beneficios = new Map(
    candidatos.map((c) => [
      c,
      beneficioCom(c, estatisticas, dentroDaPreferencia(c) ? 1 : PESO_FORA_DA_PREFERENCIA),
    ]),
  );

  const partida: Estado = {
    posicao: preferencias.origem,
    relogio: new Date(preferencias.inicioPrevisto),
    gasto: 0,
    tempo: 0,
    foraDoHorario: 0,
  };

  /**
   * Avança o estado por uma sequência de paradas e diz se ela cabe no tempo e
   * no orçamento (null se não couber). O horário de funcionamento não invalida
   * a sequência: só conta quantas visitas caem fora dele.
   */
  const percorrer = (de: Estado, sequencia: Candidato[]): Estado | null => {
    let estado = de;
    for (const candidato of sequencia) {
      const trecho = medir(estado.posicao, candidato.coordenada, estado.relogio);
      const deltaTempo = trecho.duracaoMin + candidato.tempoVisitaMin;
      const deltaCusto = trecho.custo.estimado + custoNoLocal(candidato);

      if (estado.tempo + deltaTempo > tempoTotal) return null;
      if (teto != null && estado.gasto + deltaCusto > teto) return null;
      const aberto = cabeNaJanela(candidato, estado.relogio, trecho.duracaoMin);

      estado = {
        posicao: candidato.coordenada,
        relogio: new Date(estado.relogio.getTime() + deltaTempo * 60_000),
        gasto: estado.gasto + deltaCusto,
        tempo: estado.tempo + deltaTempo,
        foraDoHorario: estado.foraDoHorario + (aberto ? 0 : 1),
      };
    }
    return estado;
  };

  const selecionados: Candidato[] = [];
  const restantes = [...candidatos];
  // A rota escolhida sempre cabe: só entra ponto que cabe e o 2-opt só aceita
  // ordem que cabe.
  const estadoDaRota = () => percorrer(partida, selecionados)!;

  /**
   * Inserção gulosa: acrescenta ao fim da rota o melhor candidato que ainda
   * cabe, entre os de relevância igual ou maior que `relevanciaMinima`.
   */
  const ampliar = (relevanciaMinima: number) => {
    for (;;) {
      const estado = estadoDaRota();
      let melhor: { candidato: Candidato; razao: number } | null = null;

      for (const candidato of restantes) {
        // Nas fases dos imperdíveis só entra o que o usuário disse querer.
        if (
          relevanciaMinima > 0 &&
          (!dentroDaPreferencia(candidato) || candidato.relevancia < relevanciaMinima)
        ) {
          continue;
        }

        const trecho = medir(estado.posicao, candidato.coordenada, estado.relogio);
        const deltaTempo = trecho.duracaoMin + candidato.tempoVisitaMin;
        const deltaCusto = trecho.custo.estimado + custoNoLocal(candidato);

        if (estado.tempo + deltaTempo > tempoTotal) continue;
        if (teto != null && estado.gasto + deltaCusto > teto) continue;

        // Nas fases dos imperdíveis só entra lugar aberto na hora; o fechado
        // fica para a última fase, valendo menos.
        const aberto = cabeNaJanela(candidato, estado.relogio, trecho.duracaoMin);
        if (relevanciaMinima > 0 && !aberto) continue;

        const razao =
          (beneficios.get(candidato)! * (aberto ? 1 : FATOR_FORA_DO_HORARIO)) /
          (deltaTempo / tempoTotal + deltaCusto / regua);

        if (!melhor || razao > melhor.razao) melhor = { candidato, razao };
      }

      if (!melhor) return;
      selecionados.push(melhor.candidato);
      restantes.splice(restantes.indexOf(melhor.candidato), 1);
    }
  };

  /**
   * "Menor deslocamento" pesa tempo e dinheiro como a escolha das paradas:
   * pegar um carro para chegar mais rápido ao ponto mais distante não é
   * melhor do que caminhar na ordem, e o custo sai de graça na conta.
   */
  const custoDaRota = (estado: Estado) =>
    estado.tempo / tempoTotal +
    estado.gasto / regua +
    PENALIDADE_FORA_DO_HORARIO * estado.foraDoHorario;

  /**
   * 2-opt: inverte um trecho da rota quando isso diminui o deslocamento total
   * e a rota continua cabendo no tempo e no orçamento. É o que desfaz o
   * zigue-zague que a inserção gulosa deixa (ela escolhe cada parada pelo
   * valor, sem olhar o desenho do percurso). Aplica a primeira inversão que
   * melhora e recomeça a busca, até não haver melhora.
   *
   * O começo da rota não muda numa inversão a partir da posição i, então o
   * estado até ali é calculado uma vez por busca, e só o resto é simulado.
   */
  const desembaracar = (): boolean => {
    let melhorou = false;
    let atual = estadoDaRota();

    for (let inversao = 0; inversao < MAX_INVERSOES; inversao += 1) {
      const antesDe: Estado[] = [partida];
      for (const candidato of selecionados) {
        antesDe.push(percorrer(antesDe[antesDe.length - 1]!, [candidato])!);
      }

      let achou = false;
      for (let i = 0; i < selecionados.length - 1 && !achou; i += 1) {
        for (let j = i + 1; j < selecionados.length && !achou; j += 1) {
          const resto = [...selecionados.slice(i, j + 1).reverse(), ...selecionados.slice(j + 1)];
          const estado = percorrer(antesDe[i]!, resto);
          if (estado && custoDaRota(estado) < custoDaRota(atual) - GANHO_MINIMO_DA_INVERSAO) {
            selecionados.splice(i, selecionados.length - i, ...resto);
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

  // Escolhe, desembaraça e, com o tempo que sobrou, escolhe de novo.
  const escolher = () => {
    for (const fase of FASES_DE_RELEVANCIA) ampliar(fase);
  };
  escolher();
  for (let ciclo = 0; ciclo < MAX_CICLOS_DE_MELHORIA; ciclo += 1) {
    if (!desembaracar()) break;
    escolher();
  }

  const descartados = explicarDescartes(restantes, estadoDaRota(), preferencias, medir);
  const itens = montarItens(selecionados, preferencias, medir);

  return {
    itens,
    descartados,
    totais: somarTotais(itens, tarifa),
    diagnostico: {
      rotas: qualidadeDasRotas(itens),
      candidatosAvaliados: candidatos.length,
      trechosCalculados: calculados(),
      duracaoMs: Number((performance.now() - inicio).toFixed(1)),
    },
  };
}

/** Explica por que cada candidato restante ficou de fora. */
function explicarDescartes(
  restantes: Candidato[],
  final: Estado,
  preferencias: Preferencias,
  medir: MedirTrecho,
): Descartado[] {
  const teto = preferencias.orcamento;

  return restantes.map((candidato) => {
    const trecho = medir(final.posicao, candidato.coordenada, final.relogio);
    const faltaOrcamento =
      teto == null ? 0 : final.gasto + trecho.custo.estimado + custoNoLocal(candidato) - teto;
    const faltaTempo =
      final.tempo + trecho.duracaoMin + candidato.tempoVisitaMin - preferencias.tempoDisponivelMin;

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
    // Não deveria acontecer: a última fase só para quando nada mais cabe no
    // tempo nem no orçamento. Fica como reserva, com o motivo mais provável.
    return {
      candidato,
      motivo: 'tempo' as const,
      detalhe: 'não coube na sequência do roteiro',
    };
  });
}

/** Monta as paradas na ordem final, com os horários definitivos. */
function montarItens(
  selecionados: Candidato[],
  preferencias: Preferencias,
  medir: MedirTrecho,
): ItemRoteiro[] {
  let cursor = new Date(preferencias.inicioPrevisto);
  let anterior = preferencias.origem;

  return selecionados.map((candidato, indice) => {
    const trecho = medir(anterior, candidato.coordenada, cursor);
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
      situacaoNoHorario: situacaoNoHorario(candidato, chegada),
    };
  });
}

function somarTotais(itens: ItemRoteiro[], tarifa: ParametrosTarifa): ResultadoRoteiro['totais'] {
  const somar = (f: (t: Trecho) => number) =>
    itens.reduce((soma, item) => soma + f(item.trechoAteAqui), 0);

  const trechosAPe = itens.filter((i) => i.trechoAteAqui.modal === 'pe');

  // Quanto custaria fazer cada trecho a pé de carro de aplicativo, na bandeira
  // da hora em que ele começa.
  const economiaCaminhando = emReais(
    trechosAPe.reduce((soma, item) => {
      const saidaDoTrecho = new Date(
        item.chegadaPrevista.getTime() - item.trechoAteAqui.duracaoMin * 60_000,
      );
      const taxi = custoTaxi(item.trechoAteAqui.distanciaKm, 0, bandeiraDe(saidaDoTrecho), tarifa);
      return soma + faixaAplicativo(taxi, tarifa).estimado;
    }, 0),
  );

  return {
    custoTransporte: {
      min: emReais(somar((t) => t.custo.min)),
      estimado: emReais(somar((t) => t.custo.estimado)),
      max: emReais(somar((t) => t.custo.max)),
    },
    custoLocais: emReais(itens.reduce((s, i) => s + i.custoNoLocal, 0)),
    duracaoMin: itens.reduce(
      (s, i) => s + i.trechoAteAqui.duracaoMin + i.candidato.tempoVisitaMin,
      0,
    ),
    distanciaKm: Number(somar((t) => t.distanciaKm).toFixed(1)),
    trechosAPe: trechosAPe.length,
    economiaCaminhando,
  };
}

/** Se o roteiro final foi todo medido pelas ruas, só em parte ou só estimado. */
function qualidadeDasRotas(itens: ItemRoteiro[]): ResultadoRoteiro['diagnostico']['rotas'] {
  if (itens.length === 0 || itens.every((i) => i.trechoAteAqui.fonte === 'estimada')) {
    return 'estimada';
  }
  return itens.every((i) => i.trechoAteAqui.fonte === 'ruas') ? 'ruas' : 'parcial';
}
