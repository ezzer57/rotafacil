/**
 * Dados de exemplo para os testes dos componentes do roteiro.
 */

import type { ItemRoteiro, PontoInteresse, Roteiro, Trecho } from '@/domain/types';

export function pontoDeExemplo(parcial: Partial<PontoInteresse> = {}): PontoInteresse {
  return {
    id: 'qx-museu',
    nome: 'Museu Jacinto de Sousa',
    categoria: 'cultura',
    endereco: 'Centro, Quixadá - CE',
    coordenada: { lat: -4.97, lng: -39.01 },
    nota: null,
    avaliacoes: 0,
    faixaPreco: null,
    fotoUrl: null,
    fotoCredito: null,
    fotoFonte: null,
    tempoVisitaMin: 60,
    relevancia: 4,
    arLivre: false,
    abertoAgora: true,
    horarioHoje: '08:00 às 17:00',
    ...parcial,
  };
}

export const trechoAPe: Trecho = {
  origemId: 'origem',
  partida: null,
  destinoId: 'qx-museu',
  modal: 'pe',
  fonte: 'estimada',
  trajeto: null,
  distanciaKm: 0.4,
  duracaoMin: 6,
  bandeira: null,
  custo: { min: 0, estimado: 0, max: 0 },
  calculo: null,
};

export const trechoDeCarro: Trecho = {
  origemId: 'origem',
  partida: null,
  destinoId: 'qx-museu',
  modal: 'app',
  fonte: 'ruas',
  trajeto: null,
  distanciaKm: 3.2,
  duracaoMin: 9,
  bandeira: 1,
  custo: { min: 11.2, estimado: 13.5, max: 18.1 },
  calculo: {
    bandeirada: 5,
    valorPorKm: 3,
    distanciaKm: 3.2,
    minutosLentos: 1.8,
    valorHoraParada: 28,
    subtotalTaxi: 15.44,
    fatorAplicativo: 0.85,
    norma: 'Tarifa de teste',
  },
};

export function itemDeExemplo(parcial: Partial<ItemRoteiro> = {}): ItemRoteiro {
  return {
    ordem: 1,
    ponto: pontoDeExemplo(),
    // 9h06 em Quixadá (UTC-3).
    chegadaPrevista: '2026-11-25T12:06:00.000Z',
    saidaPrevista: '2026-11-25T13:06:00.000Z',
    trechoAteAqui: trechoAPe,
    custoNoLocal: 0,
    situacaoNoHorario: 'aberto',
    visitado: false,
    visita: null,
    ...parcial,
  };
}

export function roteiroDeExemplo(parcial: Partial<Roteiro> = {}): Roteiro {
  const itens = parcial.itens ?? [itemDeExemplo()];
  return {
    id: 'rot-1',
    cidadeId: 'quixada',
    cidadeNome: 'Quixadá',
    criadoEm: '2026-11-25T11:00:00.000Z',
    inicioPrevisto: '2026-11-25T12:00:00.000Z',
    orcamento: 80,
    tempoDisponivelMin: 240,
    itens,
    totais: {
      custoTransporte: { min: 11.2, estimado: 13.5, max: 18.1 },
      custoLocais: 0,
      custoTotal: { min: 11.2, estimado: 13.5, max: 18.1 },
      duracaoMin: 75,
      distanciaKm: 3.2,
      usoOrcamento: 17,
      economiaCaminhando: 0,
      trechosAPe: 0,
      pontosVisitados: 0,
      custoRegistrado: null,
    },
    descartados: [],
    diagnostico: { rotas: 'ruas', candidatosAvaliados: 13, trechosCalculados: 40, duracaoMs: 2 },
    preferencias: {
      cidadeId: 'quixada',
      origem: { lat: -4.97, lng: -39.01 },
      categorias: [],
      orcamento: 80,
      tempoDisponivelMin: 240,
      inicioPrevisto: '2026-11-25T12:00:00.000Z',
    },
    recalculo: null,
    ...parcial,
  };
}
