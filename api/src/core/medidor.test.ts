/**
 * Testes das medidas pelas ruas: o medidor de matriz e o uso dele pelo motor.
 */

import { describe, expect, it } from 'vitest';

import { criarMedidor, type MatrizDeRotas } from './medidor.js';
import { gerarRoteiro, type Candidato, type Preferencias } from './roteirizacao.js';
import type { ParametrosTarifa } from './tarifa.js';

const TARIFA: ParametrosTarifa = {
  bandeirada: 5.5,
  kmBandeira1: 3.2,
  kmBandeira2: 3.9,
  horaParada: 30,
  alfa: 0.82,
  alfaP10: 0.68,
  alfaP90: 1.1,
  norma: 'Tarifa de teste',
};

const ORIGEM = { lat: -4.9712, lng: -39.0156 };
const PERTO = { lat: -4.9722, lng: -39.0156 }; // ~110 m ao sul
const LONGE = { lat: -5.0312, lng: -39.0156 }; // ~6,7 km ao sul

const candidato = (id: string, coordenada: { lat: number; lng: number }): Candidato => ({
  id,
  nome: id,
  categoria: 'cultura',
  coordenada,
  nota: 4.5,
  avaliacoes: 500,
  faixaPreco: null,
  tempoVisitaMin: 30,
  relevancia: 3,
  abreMin: null,
  fechaMin: null,
});

const preferencias: Preferencias = {
  origem: ORIGEM,
  categorias: [],
  orcamento: null,
  tempoDisponivelMin: 480,
  inicioPrevisto: new Date('2026-10-21T09:00:00'),
};

/** Matriz 3x3 com [origem, perto, longe]; só as linhas usadas importam. */
const matriz = (distanciasM: number[][], duracoesS: number[][]): MatrizDeRotas => ({
  distanciasM,
  duracoesS,
});

const PONTOS = [ORIGEM, PERTO, LONGE];

describe('criarMedidor', () => {
  const aPe = matriz(
    [
      [0, 150, 8000],
      [150, 0, 8100],
      [8000, 8100, 0],
    ],
    [
      [0, 120, 6400],
      [120, 0, 6500],
      [6400, 6500, 0],
    ],
  );

  it('devolve distância em km e tempo em minutos', () => {
    const medidor = criarMedidor(PONTOS, aPe, null);
    expect(medidor.aPe(ORIGEM, PERTO)).toEqual({ distanciaKm: 0.15, duracaoMin: 2 });
  });

  it('não tem medida para o modal cuja matriz faltou', () => {
    const medidor = criarMedidor(PONTOS, aPe, null);
    expect(medidor.deCarro(ORIGEM, PERTO)).toBeNull();
  });

  it('não tem medida para um ponto que não estava na matriz', () => {
    const medidor = criarMedidor(PONTOS, aPe, aPe);
    expect(medidor.aPe(ORIGEM, { lat: 0, lng: 0 })).toBeNull();
  });

  it('descarta distância zero entre pontos distantes, sinal de que o servidor os colou na mesma rua', () => {
    const colada = matriz(
      [
        [0, 0, 8000],
        [0, 0, 8100],
        [8000, 8100, 0],
      ],
      [
        [0, 0, 600],
        [0, 0, 600],
        [600, 600, 0],
      ],
    );
    // PERTO fica ~110 m da origem: linha reta acima de 50 m e medida zero.
    expect(criarMedidor(PONTOS, colada, colada).deCarro(ORIGEM, PERTO)).toBeNull();
  });

  it('descarta célula sem resultado (nulo) devolvida pelo servidor', () => {
    const buraco: MatrizDeRotas = {
      distanciasM: [
        [0, null, 8000],
        [null, 0, 8100],
        [8000, 8100, 0],
      ],
      duracoesS: [
        [0, null, 600],
        [null, 0, 600],
        [600, 600, 0],
      ],
    };
    expect(criarMedidor(PONTOS, buraco, buraco).deCarro(ORIGEM, PERTO)).toBeNull();
  });
});

describe('gerarRoteiro com medidas pelas ruas', () => {
  const aPe = matriz(
    [
      [0, 150, 8000],
      [150, 0, 8100],
      [8000, 8100, 0],
    ],
    [
      [0, 120, 6400],
      [120, 0, 6500],
      [6400, 6500, 0],
    ],
  );
  const deCarro = matriz(
    [
      [0, 140, 9100],
      [140, 0, 9200],
      [9100, 9200, 0],
    ],
    [
      [0, 40, 780],
      [40, 0, 790],
      [780, 790, 0],
    ],
  );

  it('usa a distância pelas ruas, e não a linha reta, e marca o trecho como medido', () => {
    const medidor = criarMedidor(PONTOS, aPe, deCarro);
    const { itens, diagnostico } = gerarRoteiro(
      [candidato('longe', LONGE)],
      preferencias,
      TARIFA,
      medidor,
    );

    const trecho = itens[0]!.trechoAteAqui;
    expect(trecho.fonte).toBe('ruas');
    expect(trecho.modal).toBe('app');
    expect(trecho.distanciaKm).toBe(9.1);
    expect(trecho.duracaoMin).toBe(13);
    expect(diagnostico.rotas).toBe('ruas');
  });

  it('vai a pé quando o caminho a pé é curto, com a duração do caminho a pé', () => {
    const medidor = criarMedidor(PONTOS, aPe, deCarro);
    const { itens } = gerarRoteiro([candidato('perto', PERTO)], preferencias, TARIFA, medidor);

    const trecho = itens[0]!.trechoAteAqui;
    expect(trecho.modal).toBe('pe');
    expect(trecho.fonte).toBe('ruas');
    expect(trecho.distanciaKm).toBe(0.15);
    expect(trecho.duracaoMin).toBe(2);
  });

  it('decide o modal pela distância a pé: rua com muita volta passa a ser de carro', () => {
    // Em linha reta são 110 m, mas a pé o caminho tem 1,4 km.
    const volta = matriz(
      [
        [0, 1400, 8000],
        [1400, 0, 8100],
        [8000, 8100, 0],
      ],
      [
        [0, 1100, 6400],
        [1100, 0, 6500],
        [6400, 6500, 0],
      ],
    );
    const medidor = criarMedidor(PONTOS, volta, deCarro);
    const { itens } = gerarRoteiro([candidato('perto', PERTO)], preferencias, TARIFA, medidor);
    expect(itens[0]!.trechoAteAqui.modal).toBe('app');
    expect(itens[0]!.trechoAteAqui.distanciaKm).toBe(0.14);
  });

  it('sem medidor, estima por linha reta e diz que é estimativa', () => {
    const { itens, diagnostico } = gerarRoteiro([candidato('longe', LONGE)], preferencias, TARIFA);

    expect(itens[0]!.trechoAteAqui.fonte).toBe('estimada');
    // 6,7 km em linha reta x 1,3
    expect(itens[0]!.trechoAteAqui.distanciaKm).toBeCloseTo(8.67, 1);
    expect(diagnostico.rotas).toBe('estimada');
  });

  it('com medida só para o carro, o trecho a pé continua estimado e o roteiro sai "parcial"', () => {
    const medidor = criarMedidor(PONTOS, null, deCarro);
    const { itens, diagnostico } = gerarRoteiro(
      [candidato('perto', PERTO), candidato('longe', LONGE)],
      preferencias,
      TARIFA,
      medidor,
    );

    expect(itens.map((i) => i.trechoAteAqui.fonte).sort()).toEqual(['estimada', 'ruas']);
    expect(diagnostico.rotas).toBe('parcial');
  });
});
