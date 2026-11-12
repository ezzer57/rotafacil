/**
 * Mini-motor de roteirização e custo usado APENAS pelo mock.
 *
 * É uma versão reduzida do algoritmo descrito nas seções 3.5 e 3.7 do TCC:
 * seleção gulosa por razão benefício/consumo, com restrição de orçamento,
 * de tempo disponível e de janela de funcionamento. Existe para que a
 * interface reaja de verdade às entradas do usuário durante a demonstração.
 *
 * Quando o backend ficar pronto, este arquivo é descartado: o servidor passa
 * a devolver o roteiro montado, no mesmo formato de src/domain/types.ts.
 */

import { formatarDuracao, formatarReais } from '@/domain/format';
import { distanciaViaria } from '@/domain/geo';
import type {
  Bandeira,
  Coordenada,
  DetalheCalculoTarifa,
  FaixaCusto,
  ItemRoteiro,
  MotivoDescarte,
  PontoDescartado,
  PontoInteresse,
  PreferenciasRoteiro,
  Roteiro,
  TotaisRoteiro,
  Trecho,
} from '@/domain/types';
import { CIDADES, TARIFAS, pontosPorCidade, type TarifaTaxi } from './dados';

/** Acima desta distância o deslocamento deixa de ser a pé. */
const DISTANCIA_MAX_A_PE_KM = 1;
const VELOCIDADE_A_PE_KMH = 4.5;
const VELOCIDADE_CARRO_KMH = 28;
/** Régua do custo quando não há teto de gasto, a mesma da API. */
const ORCAMENTO_DE_REFERENCIA = 80;

/** Bandeira 2 das 22h às 6h e aos domingos. */
export function bandeiraDe(data: Date): Bandeira {
  const hora = data.getHours();
  const domingo = data.getDay() === 0;
  return hora >= 22 || hora < 6 || domingo ? 2 : 1;
}

/** Equação (8) do TCC: tarifa de táxi do trecho. */
export function custoTaxi(
  distanciaKm: number,
  minutosLentos: number,
  bandeira: Bandeira,
  tarifa: TarifaTaxi,
): number {
  const valorKm = bandeira === 1 ? tarifa.kmBandeira1 : tarifa.kmBandeira2;
  return tarifa.bandeirada + valorKm * distanciaKm + (tarifa.horaParada / 60) * minutosLentos;
}

/** Equação (10): converte a tarifa de táxi em faixa de preço de aplicativo. */
export function faixaAplicativo(custoBase: number, tarifa: TarifaTaxi): FaixaCusto {
  const arredonda = (v: number) => Math.round(v * 100) / 100;
  return {
    min: arredonda(custoBase * tarifa.alfaP10),
    estimado: arredonda(custoBase * tarifa.alfa),
    max: arredonda(custoBase * tarifa.alfaP90),
  };
}

export function montarTrecho(
  origem: { id: string; coordenada: Coordenada },
  destino: { id: string; coordenada: Coordenada },
  partida: Date,
  tarifa: TarifaTaxi,
): Trecho {
  const distanciaKm = Number(distanciaViaria(origem.coordenada, destino.coordenada).toFixed(2));
  const aPe = distanciaKm <= DISTANCIA_MAX_A_PE_KM;
  const duracaoMin = Math.round(
    (distanciaKm / (aPe ? VELOCIDADE_A_PE_KMH : VELOCIDADE_CARRO_KMH)) * 60,
  );

  if (aPe) {
    return {
      origemId: origem.id,
      destinoId: destino.id,
      modal: 'pe',
      fonte: 'estimada',
      trajeto: null,
      distanciaKm,
      duracaoMin,
      bandeira: null,
      custo: { min: 0, estimado: 0, max: 0 },
      calculo: null,
    };
  }

  const bandeira = bandeiraDe(partida);
  // Aproximação de trânsito lento: 20% da duração do trecho.
  const minutosLentos = Number((duracaoMin * 0.2).toFixed(1));
  const subtotalTaxi = custoTaxi(distanciaKm, minutosLentos, bandeira, tarifa);

  const calculo: DetalheCalculoTarifa = {
    bandeirada: tarifa.bandeirada,
    valorPorKm: bandeira === 1 ? tarifa.kmBandeira1 : tarifa.kmBandeira2,
    distanciaKm,
    minutosLentos,
    valorHoraParada: tarifa.horaParada,
    subtotalTaxi: Number(subtotalTaxi.toFixed(2)),
    fatorAplicativo: tarifa.alfa,
    norma: tarifa.norma,
  };

  return {
    origemId: origem.id,
    destinoId: destino.id,
    modal: 'app',
    fonte: 'estimada',
    trajeto: null,
    distanciaKm,
    duracaoMin,
    bandeira,
    custo: faixaAplicativo(subtotalTaxi, tarifa),
    calculo,
  };
}

/** Custo estimado dentro do local, a partir da faixa de preço do provedor. */
function custoNoLocal(ponto: PontoInteresse): number {
  if (ponto.faixaPreco == null) return 0;
  return [0, 20, 45, 90, 160][ponto.faixaPreco] ?? 0;
}

/**
 * Janela de funcionamento em minutos desde a meia-noite, lida do texto de
 * horário do provedor. Retorna null quando o ponto não fecha.
 */
function janelaDe(ponto: PontoInteresse): { abre: number; fecha: number } | null {
  const texto = ponto.horarioHoje ?? '';
  const encontrado = texto.match(/(\d{2}):(\d{2}).+?(\d{2}):(\d{2})/);
  if (!encontrado) return null;
  return {
    abre: Number(encontrado[1]) * 60 + Number(encontrado[2]),
    fecha: Number(encontrado[3]) * 60 + Number(encontrado[4]),
  };
}

const minutosDoDia = (data: Date) => data.getHours() * 60 + data.getMinutes();

/** Valor de todos os pontos quando nenhum candidato tem nota, como na API. */
const NOTA_NEUTRA = 3;

const temNota = (p: PontoInteresse): p is PontoInteresse & { nota: number } =>
  p.nota != null && p.avaliacoes > 0;

/**
 * Pontuação bayesiana ponderada pela preferência (equação 6 do TCC). Ponto
 * sem nota vale a média dos que têm, e só quem tem nota entra na média.
 */
function pontuacao(ponto: PontoInteresse, candidatos: PontoInteresse[], peso: number): number {
  const avaliados = candidatos.filter(temNota);
  if (avaliados.length === 0) return peso * NOTA_NEUTRA;

  const C = avaliados.reduce((s, p) => s + p.nota, 0) / avaliados.length;
  if (!temNota(ponto)) return peso * C;

  const m = avaliados.map((p) => p.avaliacoes).sort((a, b) => a - b)[
    Math.floor(avaliados.length / 2)
  ]!;
  const n = ponto.avaliacoes;
  return peso * ((n * ponto.nota + m * C) / (n + m));
}

/** Mesmo cálculo da API (src/core/roteirizacao.ts): relevância pesa 70%, a nota 30%. */
const PESO_RELEVANCIA = 0.7;
const EXPOENTE_RELEVANCIA = 3;
const relevanciaEfetiva = (relevancia: number) => 5 * (relevancia / 5) ** EXPOENTE_RELEVANCIA;

function beneficio(ponto: PontoInteresse, candidatos: PontoInteresse[], peso: number): number {
  return (
    peso *
    (PESO_RELEVANCIA * relevanciaEfetiva(ponto.relevancia) +
      (1 - PESO_RELEVANCIA) * pontuacao(ponto, candidatos, 1))
  );
}

/** Primeiro os símbolos da cidade (5), depois os grandes atrativos (4), por fim o resto. */
const FASES_DE_RELEVANCIA = [5, 4, 0];

/**
 * Construção gulosa por inserção seguida de 2-opt: a cada passo acrescenta o
 * ponto com a melhor razão benefício/consumo que ainda cabe no tempo, no
 * horário de funcionamento e, quando há teto, no orçamento; depois inverte
 * trechos da rota para desfazer o zigue-zague.
 */
export function gerarRoteiro(pref: PreferenciasRoteiro): Roteiro {
  const inicio = performance.now();
  let trechosCalculados = 0;

  const teto = pref.orcamento;
  const regua = teto ?? ORCAMENTO_DE_REFERENCIA;

  const cidade = CIDADES.find((c) => c.id === pref.cidadeId) ?? CIDADES[0];
  const tarifa = TARIFAS[cidade.id];
  const candidatos = pontosPorCidade(cidade.id);

  const selecionados: PontoInteresse[] = [];
  const origem = { id: 'origem', coordenada: pref.origem };
  const alvo = (p: PontoInteresse) => ({ id: p.id, coordenada: p.coordenada });

  interface Estado {
    posicao: { id: string; coordenada: Coordenada };
    relogio: Date;
    gasto: number;
    tempo: number;
  }

  /** Percorre a sequência; devolve null se ela não couber no tempo, no teto ou nos horários. */
  const simular = (sequencia: PontoInteresse[]): Estado | null => {
    let estado: Estado = {
      posicao: origem,
      relogio: new Date(pref.inicioPrevisto),
      gasto: 0,
      tempo: 0,
    };
    for (const ponto of sequencia) {
      const trecho = montarTrecho(estado.posicao, alvo(ponto), estado.relogio, tarifa);
      trechosCalculados += 1;
      const deltaTempo = trecho.duracaoMin + ponto.tempoVisitaMin;
      const deltaCusto = trecho.custo.estimado + custoNoLocal(ponto);

      if (estado.tempo + deltaTempo > pref.tempoDisponivelMin) return null;
      if (teto != null && estado.gasto + deltaCusto > teto) return null;
      if (!cabeNaJanela(ponto, estado.relogio, trecho.duracaoMin)) return null;

      estado = {
        posicao: alvo(ponto),
        relogio: new Date(estado.relogio.getTime() + deltaTempo * 60000),
        gasto: estado.gasto + deltaCusto,
        tempo: estado.tempo + deltaTempo,
      };
    }
    return estado;
  };

  const restantes = [...candidatos];

  const ampliar = (relevanciaMinima: number) => {
    for (;;) {
      const estado = simular(selecionados)!;
      let melhor: { ponto: PontoInteresse; razao: number } | null = null;

      for (const ponto of restantes) {
        const dentroDaPreferencia =
          pref.categorias.length === 0 || pref.categorias.includes(ponto.categoria);
        const peso = dentroDaPreferencia ? 1 : 0.25;

        if (relevanciaMinima > 0 && (!dentroDaPreferencia || ponto.relevancia < relevanciaMinima)) {
          continue;
        }

        const trecho = montarTrecho(estado.posicao, alvo(ponto), estado.relogio, tarifa);
        trechosCalculados += 1;

        const deltaTempo = trecho.duracaoMin + ponto.tempoVisitaMin;
        const deltaCusto = trecho.custo.estimado + custoNoLocal(ponto);

        if (estado.tempo + deltaTempo > pref.tempoDisponivelMin) continue;
        if (teto != null && estado.gasto + deltaCusto > teto) continue;
        if (!cabeNaJanela(ponto, estado.relogio, trecho.duracaoMin)) continue;

        const razao =
          beneficio(ponto, candidatos, peso) /
          (deltaTempo / pref.tempoDisponivelMin + deltaCusto / Math.max(1, regua));

        if (!melhor || razao > melhor.razao) melhor = { ponto, razao };
      }

      if (!melhor) return;
      selecionados.push(melhor.ponto);
      restantes.splice(restantes.indexOf(melhor.ponto), 1);
    }
  };

  const custoDaRota = (estado: Estado) =>
    estado.tempo / pref.tempoDisponivelMin + estado.gasto / Math.max(1, regua);

  /** 2-opt: inverte um trecho da rota quando isso diminui tempo e custo e ela continua cabendo. */
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

  const completar = () => FASES_DE_RELEVANCIA.forEach((fase) => ampliar(fase));

  completar();
  for (let rodada = 0; rodada < 5; rodada += 1) {
    if (!desembaracar()) break;
    completar();
  }

  const final = simular(selecionados)!;
  const posicao = final.posicao;
  const relogio = final.relogio;
  const gastoAcumulado = final.gasto;
  const tempoAcumulado = final.tempo;

  // Explica, ponto a ponto, por que cada candidato ficou de fora.
  const descartados: PontoDescartado[] = restantes.map((ponto) => {
    const trecho = montarTrecho(
      posicao,
      { id: ponto.id, coordenada: ponto.coordenada },
      relogio,
      tarifa,
    );
    const faltaOrcamento =
      teto == null ? 0 : gastoAcumulado + trecho.custo.estimado + custoNoLocal(ponto) - teto;
    const faltaTempo =
      tempoAcumulado + trecho.duracaoMin + ponto.tempoVisitaMin - pref.tempoDisponivelMin;

    let motivo: MotivoDescarte = 'tempo';
    let detalhe = 'não coube na sequência do roteiro';

    if (faltaOrcamento > 0) {
      motivo = 'orcamento';
      detalhe = `faltariam ${formatarReais(faltaOrcamento)}`;
    } else if (faltaTempo > 0) {
      motivo = 'tempo';
      detalhe = `precisaria de mais ${formatarDuracao(faltaTempo)}`;
    } else if (!cabeNaJanela(ponto, relogio, trecho.duracaoMin)) {
      motivo = 'horario';
      detalhe = `fecha às ${(ponto.horarioHoje ?? '').split(/às|as/).pop()?.trim() ?? 'horário'}`;
    }

    return { ponto, motivo, detalhe };
  });

  // Monta os itens finais já com horários e trechos definitivos.
  let cursor = new Date(pref.inicioPrevisto);
  let anterior = { id: 'origem', coordenada: pref.origem };
  const itens: ItemRoteiro[] = selecionados.map((ponto, i) => {
    const trecho = montarTrecho(
      anterior,
      { id: ponto.id, coordenada: ponto.coordenada },
      cursor,
      tarifa,
    );
    const chegada = new Date(cursor.getTime() + trecho.duracaoMin * 60000);
    const saida = new Date(chegada.getTime() + ponto.tempoVisitaMin * 60000);
    cursor = saida;
    anterior = { id: ponto.id, coordenada: ponto.coordenada };
    return {
      ordem: i + 1,
      ponto,
      chegadaPrevista: chegada.toISOString(),
      saidaPrevista: saida.toISOString(),
      trechoAteAqui: trecho,
      custoNoLocal: custoNoLocal(ponto),
      visitado: false,
      visita: null,
    };
  });

  const soma = (f: (t: Trecho) => number) =>
    itens.reduce((s, i) => s + (i.trechoAteAqui ? f(i.trechoAteAqui) : 0), 0);

  const custoTransporte: FaixaCusto = {
    min: Number(soma((t) => t.custo.min).toFixed(2)),
    estimado: Number(soma((t) => t.custo.estimado).toFixed(2)),
    max: Number(soma((t) => t.custo.max).toFixed(2)),
  };
  const custoLocais = itens.reduce((s, i) => s + i.custoNoLocal, 0);

  // Quanto custaria se cada trecho a pé fosse feito de carro de aplicativo.
  const trechosAPe = itens.filter((i) => i.trechoAteAqui?.modal === 'pe');
  const economiaCaminhando = Number(
    trechosAPe
      .reduce((s, i) => {
        const t = i.trechoAteAqui!;
        return s + faixaAplicativo(custoTaxi(t.distanciaKm, 0, 1, tarifa), tarifa).estimado;
      }, 0)
      .toFixed(2),
  );

  const totais: TotaisRoteiro = {
    custoTransporte,
    custoLocais,
    custoTotal: {
      min: Number((custoTransporte.min + custoLocais).toFixed(2)),
      estimado: Number((custoTransporte.estimado + custoLocais).toFixed(2)),
      max: Number((custoTransporte.max + custoLocais).toFixed(2)),
    },
    duracaoMin: itens.reduce(
      (s, i) => s + (i.trechoAteAqui?.duracaoMin ?? 0) + i.ponto.tempoVisitaMin,
      0,
    ),
    distanciaKm: Number(soma((t) => t.distanciaKm).toFixed(1)),
    usoOrcamento:
      teto == null
        ? null
        : Math.min(
            100,
            Math.round(((custoTransporte.estimado + custoLocais) / Math.max(1, teto)) * 100),
          ),
    economiaCaminhando,
    trechosAPe: trechosAPe.length,
    pontosVisitados: 0,
    custoRegistrado: null,
  };

  return {
    id: `rot-${Date.now()}`,
    cidadeId: cidade.id,
    cidadeNome: cidade.nome,
    criadoEm: new Date().toISOString(),
    inicioPrevisto: pref.inicioPrevisto,
    orcamento: pref.orcamento,
    tempoDisponivelMin: pref.tempoDisponivelMin,
    itens,
    totais,
    descartados,
    diagnostico: {
      // O modo de demonstração não tem servidor de rotas.
      rotas: 'estimada',
      candidatosAvaliados: candidatos.length,
      trechosCalculados,
      duracaoMs: Number((performance.now() - inicio).toFixed(1)),
    },
    preferencias: pref,
  };
}

/** O ponto precisa estar aberto na chegada e até o fim da visita. */
function cabeNaJanela(ponto: PontoInteresse, partida: Date, duracaoTrechoMin: number): boolean {
  const janela = janelaDe(ponto);
  if (!janela) return true;
  const chegada = minutosDoDia(partida) + duracaoTrechoMin;
  return chegada >= janela.abre && chegada + ponto.tempoVisitaMin <= janela.fecha;
}
