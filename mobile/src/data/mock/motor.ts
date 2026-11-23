/**
 * Motor do modo de demonstração: o MESMO da API.
 *
 * Não há cópia do algoritmo aqui. O modo de demonstração chama o motor de
 * api/src/core (código puro, sem banco nem rede) e só traduz a entrada e a
 * saída para os tipos do aplicativo, como o serializador da API faz. Assim a
 * demonstração monta os mesmos roteiros que a API montaria, só que sem as
 * medidas pelas ruas: sem a API não há servidor de rotas, e as distâncias
 * saem estimadas em linha reta.
 *
 * O recálculo de um roteiro em andamento ("Recalcular daqui" e os ajustes)
 * também é o da API (api/src/core/recalculo.ts): as paradas feitas ficam e só
 * o resto é refeito.
 */

import {
  orcamentoQueSobra,
  partidaDoAjuste,
  partidaDoRecalculo,
  partidaPropriaDoResto,
  refazerORestante,
  type BaseDoPlano,
  type ParadaFeita,
  type PartidaDoResto,
} from '@motor/recalculo';
import {
  gerarRoteiro as gerarPeloMotor,
  type Candidato,
  type ItemRoteiro as ItemDoMotor,
  type ResultadoRoteiro,
  type Trecho as TrechoDoMotor,
} from '@motor/roteirizacao';

import type {
  Cidade,
  Coordenada,
  ID,
  ItemRoteiro,
  PedidoDeRecalculo,
  PontoInteresse,
  PreferenciasRoteiro,
  Reais,
  RecalculoRoteiro,
  Roteiro,
  Trecho,
} from '@/domain/types';
import { CIDADES, cidadeDoMock, janelaDoMock, pontosPorCidade, tarifaDoMock } from './dados';

const paraCandidato = (ponto: PontoInteresse): Candidato => ({
  id: ponto.id,
  nome: ponto.nome,
  categoria: ponto.categoria,
  coordenada: ponto.coordenada,
  nota: ponto.nota,
  avaliacoes: ponto.avaliacoes,
  faixaPreco: ponto.faixaPreco,
  tempoVisitaMin: ponto.tempoVisitaMin,
  relevancia: ponto.relevancia,
  arLivre: ponto.arLivre,
  ...janelaDoMock(ponto.id),
});

const paraTrecho = (
  trecho: TrechoDoMotor,
  origemId: ID,
  destinoId: ID,
  partida: Coordenada | null,
): Trecho => ({
  origemId,
  partida,
  destinoId,
  modal: trecho.modal,
  fonte: trecho.fonte,
  trajeto: null,
  distanciaKm: trecho.distanciaKm,
  duracaoMin: trecho.duracaoMin,
  bandeira: trecho.bandeira,
  custo: trecho.custo,
  calculo: trecho.calculo,
});

const TRECHO_VAZIO: TrechoDoMotor = {
  modal: 'pe',
  fonte: 'estimada',
  distanciaKm: 0,
  duracaoMin: 0,
  bandeira: null,
  custo: { min: 0, estimado: 0, max: 0 },
  calculo: null,
};

/** Uma parada do app no formato do motor (para as paradas já feitas). */
function paraItemDoMotor(item: ItemRoteiro): ItemDoMotor {
  const trecho = item.trechoAteAqui;
  return {
    ordem: item.ordem,
    candidato: paraCandidato(item.ponto),
    chegadaPrevista: new Date(item.chegadaPrevista),
    saidaPrevista: new Date(item.saidaPrevista),
    custoNoLocal: item.custoNoLocal,
    situacaoNoHorario: item.situacaoNoHorario,
    trechoAteAqui: trecho
      ? {
          modal: trecho.modal,
          fonte: trecho.fonte,
          distanciaKm: trecho.distanciaKm,
          duracaoMin: trecho.duracaoMin,
          bandeira: trecho.bandeira,
          custo: trecho.custo,
          calculo: trecho.calculo,
        }
      : TRECHO_VAZIO,
  };
}

const emReais = (valor: number) => Math.round(valor * 100) / 100;

interface Montagem {
  preferencias: PreferenciasRoteiro;
  cidade: Cidade;
  /** De onde saiu o trecho até cada parada quando não foi da anterior. */
  partidas?: (Coordenada | null)[];
  recalculo?: RecalculoRoteiro | null;
}

/** O resultado do motor no formato que a API devolve (api/src/modules/roteiros/serializador.ts). */
function paraRoteiro(
  resultado: ResultadoRoteiro,
  { preferencias, cidade, partidas = [], recalculo = null }: Montagem,
): Roteiro {
  const pontoPorId = new Map(pontosPorCidade(cidade.id).map((p) => [p.id, p]));
  const ponto = (id: ID) => pontoPorId.get(id)!;
  const { custoTransporte, custoLocais } = resultado.totais;
  const teto = preferencias.orcamento;

  return {
    id: `rot-${Date.now()}`,
    cidadeId: cidade.id,
    cidadeNome: cidade.nome,
    criadoEm: new Date().toISOString(),
    inicioPrevisto: preferencias.inicioPrevisto,
    orcamento: teto,
    tempoDisponivelMin: preferencias.tempoDisponivelMin,

    itens: resultado.itens.map((item, indice) => {
      const partida = partidas[indice] ?? null;
      return {
        ordem: item.ordem,
        ponto: ponto(item.candidato.id),
        chegadaPrevista: item.chegadaPrevista.toISOString(),
        saidaPrevista: item.saidaPrevista.toISOString(),
        // A origem do primeiro trecho é a partida do roteiro.
        trechoAteAqui: paraTrecho(
          item.trechoAteAqui,
          partida ? 'posicao' : indice === 0 ? 'origem' : resultado.itens[indice - 1]!.candidato.id,
          item.candidato.id,
          partida,
        ),
        custoNoLocal: item.custoNoLocal,
        situacaoNoHorario: item.situacaoNoHorario,
        visitado: false,
        visita: null,
      };
    }),

    totais: {
      custoTransporte,
      custoLocais,
      custoTotal: {
        min: emReais(custoTransporte.min + custoLocais),
        estimado: emReais(custoTransporte.estimado + custoLocais),
        max: emReais(custoTransporte.max + custoLocais),
      },
      duracaoMin: resultado.totais.duracaoMin,
      distanciaKm: resultado.totais.distanciaKm,
      usoOrcamento:
        teto == null
          ? null
          : Math.min(
              100,
              Math.round(((custoTransporte.estimado + custoLocais) / Math.max(1, teto)) * 100),
            ),
      economiaCaminhando: resultado.totais.economiaCaminhando,
      trechosAPe: resultado.totais.trechosAPe,
      pontosVisitados: 0,
      custoRegistrado: null,
    },

    descartados: resultado.descartados.map((d) => ({
      ponto: ponto(d.candidato.id),
      motivo: d.motivo,
      detalhe: d.detalhe,
    })),

    diagnostico: resultado.diagnostico,
    preferencias,
    recalculo,
  };
}

const cidadeDoRoteiro = (cidadeId: ID) =>
  CIDADES.find((c) => c.id === cidadeId) ?? cidadeDoMock('quixada');

/**
 * Gera o roteiro como a API: os candidatos são os pontos da cidade menos os
 * que o usuário tirou (`excluidos`, como a coluna pontosExcluidos do banco).
 */
export function gerarRoteiro(preferencias: PreferenciasRoteiro, excluidos: ID[] = []): Roteiro {
  const cidade = cidadeDoRoteiro(preferencias.cidadeId);
  const pontos = pontosPorCidade(cidade.id).filter((p) => !excluidos.includes(p.id));
  const pedido = {
    origem: preferencias.origem,
    categorias: preferencias.categorias,
    orcamento: preferencias.orcamento,
    tempoDisponivelMin: preferencias.tempoDisponivelMin,
    inicioPrevisto: new Date(preferencias.inicioPrevisto),
  };

  const resultado = gerarPeloMotor(pontos.map(paraCandidato), pedido, tarifaDoMock(cidade.id));
  return paraRoteiro(resultado, { preferencias, cidade });
}

/** As paradas em que a pessoa já chegou (o roteiro precisa vir com as visitas). */
function paradasFeitas(roteiro: Roteiro): (ParadaFeita & { doApp: ItemRoteiro })[] {
  return [...roteiro.itens]
    .sort((a, b) => a.ordem - b.ordem)
    .flatMap((item) =>
      item.visita
        ? [
            {
              item: paraItemDoMotor(item),
              chegadaEm: new Date(item.visita.chegadaEm),
              custoRegistrado: item.visita.custoRegistrado,
              doApp: item,
            },
          ]
        : [],
    );
}

/** O plano em vigor: o último "Recalcular daqui" ou, sem ele, o pedido original. */
function baseDoPlano(roteiro: Roteiro): BaseDoPlano {
  const { recalculo, preferencias } = roteiro;
  return recalculo
    ? {
        origem: recalculo.origem,
        inicio: new Date(recalculo.em),
        tempoDisponivelMin: recalculo.tempoDisponivelMin,
        recalculadoEm: new Date(recalculo.em),
      }
    : {
        origem: preferencias.origem,
        inicio: new Date(preferencias.inicioPrevisto),
        tempoDisponivelMin: preferencias.tempoDisponivelMin,
        recalculadoEm: null,
      };
}

/**
 * Refaz o que falta de um roteiro em andamento, como a API: num ajuste
 * (`recalcular` ausente) ou no "Recalcular daqui". O roteiro precisa vir com
 * as visitas aplicadas; o que volta não traz as visitas (quem guarda é o
 * modo de demonstração), mas mantém o identificador e a data de criação.
 */
export function refazerRoteiro(
  roteiro: Roteiro,
  {
    excluidos,
    teto,
    recalcular,
  }: {
    excluidos: ID[];
    teto: Reais | null;
    recalcular?: PedidoDeRecalculo;
  },
): Roteiro {
  const cidade = cidadeDoRoteiro(roteiro.cidadeId);
  const feitas = paradasFeitas(roteiro);
  const base = baseDoPlano(roteiro);

  let recalculo = roteiro.recalculo;
  let partida: PartidaDoResto;
  if (recalcular) {
    const agora = new Date();
    const { origem, de } = partidaDoRecalculo(recalcular.origem, base, feitas);
    recalculo = {
      em: agora.toISOString(),
      origem,
      tempoDisponivelMin: recalcular.tempoDisponivelMin,
      de,
    };
    partida = { origem, inicio: agora, tempoDisponivelMin: recalcular.tempoDisponivelMin };
  } else {
    partida = partidaDoAjuste(base, feitas);
  }

  const pontos = pontosPorCidade(cidade.id).filter((p) => !excluidos.includes(p.id));
  const resultado = refazerORestante(
    feitas,
    pontos.map(paraCandidato),
    {
      origem: partida.origem,
      categorias: roteiro.preferencias.categorias,
      orcamento: orcamentoQueSobra(teto, feitas),
      tempoDisponivelMin: partida.tempoDisponivelMin,
      inicioPrevisto: partida.inicio,
    },
    tarifaDoMock(cidade.id),
  );

  const novos = resultado.itens.length - feitas.length;
  const primeira = partidaPropriaDoResto(feitas, roteiro.preferencias.origem, partida.origem);
  const partidas = [
    ...feitas.map((f) => f.doApp.trechoAteAqui?.partida ?? null),
    ...Array.from({ length: novos }, (_, i) => (i === 0 ? primeira : null)),
  ];

  return {
    ...paraRoteiro(resultado, {
      preferencias: { ...roteiro.preferencias, orcamento: teto },
      cidade,
      partidas,
      recalculo,
    }),
    id: roteiro.id,
    criadoEm: roteiro.criadoEm,
  };
}
