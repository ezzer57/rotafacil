/**
 * Motor do modo de demonstração: o MESMO da API.
 *
 * Não há cópia do algoritmo aqui. O modo de demonstração chama o motor de
 * api/src/core (código puro, sem banco nem rede) e só traduz a entrada e a
 * saída para os tipos do aplicativo, como o serializador da API faz. Assim a
 * demonstração monta os mesmos roteiros que a API montaria, só que sem as
 * medidas pelas ruas: sem a API não há servidor de rotas, e as distâncias
 * saem estimadas em linha reta.
 */

import {
  gerarRoteiro as gerarPeloMotor,
  type Candidato,
  type ResultadoRoteiro,
  type Trecho as TrechoDoMotor,
} from '@motor/roteirizacao';

import type {
  Cidade,
  ID,
  PontoInteresse,
  PreferenciasRoteiro,
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

const paraTrecho = (trecho: TrechoDoMotor, origemId: ID, destinoId: ID): Trecho => ({
  origemId,
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

const emReais = (valor: number) => Math.round(valor * 100) / 100;

/** O resultado do motor no formato que a API devolve (api/src/modules/roteiros/serializador.ts). */
function paraRoteiro(
  resultado: ResultadoRoteiro,
  preferencias: PreferenciasRoteiro,
  cidade: Cidade,
  pontoPorId: Map<ID, PontoInteresse>,
): Roteiro {
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

    itens: resultado.itens.map((item, indice) => ({
      ordem: item.ordem,
      ponto: ponto(item.candidato.id),
      chegadaPrevista: item.chegadaPrevista.toISOString(),
      saidaPrevista: item.saidaPrevista.toISOString(),
      // A origem do primeiro trecho é a posição do usuário.
      trechoAteAqui: paraTrecho(
        item.trechoAteAqui,
        indice === 0 ? 'origem' : resultado.itens[indice - 1]!.candidato.id,
        item.candidato.id,
      ),
      custoNoLocal: item.custoNoLocal,
      situacaoNoHorario: item.situacaoNoHorario,
      visitado: false,
      visita: null,
    })),

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
  };
}

/**
 * Gera o roteiro como a API: os candidatos são os pontos da cidade menos os
 * que o usuário tirou (`excluidos`, como a coluna pontosExcluidos do banco).
 */
export function gerarRoteiro(preferencias: PreferenciasRoteiro, excluidos: ID[] = []): Roteiro {
  const cidade = CIDADES.find((c) => c.id === preferencias.cidadeId) ?? cidadeDoMock('quixada');
  const pontos = pontosPorCidade(cidade.id).filter((p) => !excluidos.includes(p.id));

  const resultado = gerarPeloMotor(
    pontos.map(paraCandidato),
    {
      origem: preferencias.origem,
      categorias: preferencias.categorias,
      orcamento: preferencias.orcamento,
      tempoDisponivelMin: preferencias.tempoDisponivelMin,
      inicioPrevisto: new Date(preferencias.inicioPrevisto),
    },
    tarifaDoMock(cidade.id),
  );

  return paraRoteiro(resultado, preferencias, cidade, new Map(pontos.map((p) => [p.id, p])));
}
