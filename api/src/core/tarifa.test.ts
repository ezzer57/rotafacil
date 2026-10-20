/**
 * Testes da estimativa de custo.
 *
 * Os valores esperados são calculados à mão a partir da fórmula do
 * taxímetro, para que o teste comprove a equação, e não apenas repita o que
 * o código faz.
 */

import { describe, expect, it } from 'vitest';

import {
  bandeiraDe,
  custoTaxi,
  emReais,
  estimarTrechoPorAplicativo,
  faixaAplicativo,
  mape,
  type ParametrosTarifa,
} from './tarifa.js';

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

describe('bandeiraDe', () => {
  it('aplica bandeira 1 em horário comercial de dia útil', () => {
    // Quarta-feira, 14h.
    expect(bandeiraDe(new Date('2026-10-21T14:00:00'))).toBe(1);
  });

  it('aplica bandeira 2 a partir das 22h', () => {
    expect(bandeiraDe(new Date('2026-10-21T22:00:00'))).toBe(2);
    expect(bandeiraDe(new Date('2026-10-21T23:59:00'))).toBe(2);
  });

  it('aplica bandeira 2 na madrugada, até as 6h', () => {
    expect(bandeiraDe(new Date('2026-10-21T05:59:00'))).toBe(2);
    expect(bandeiraDe(new Date('2026-10-21T06:00:00'))).toBe(1);
  });

  it('aplica bandeira 2 no domingo inteiro', () => {
    // 2026-10-25 é um domingo.
    expect(bandeiraDe(new Date('2026-10-25T10:00:00'))).toBe(2);
  });
});

describe('custoTaxi', () => {
  it('soma bandeirada, quilometragem e tempo parado', () => {
    // 5,50 + (10 × 3,20) + (30 ÷ 60 × 6) = 5,50 + 32,00 + 3,00 = 40,50
    expect(custoTaxi(10, 6, 1, TARIFA)).toBe(40.5);
  });

  it('usa o valor da bandeira 2 quando aplicável', () => {
    // 5,50 + (10 × 3,90) + 0 = 44,50
    expect(custoTaxi(10, 0, 2, TARIFA)).toBe(44.5);
  });

  it('cobra apenas a bandeirada em distância zero', () => {
    expect(custoTaxi(0, 0, 1, TARIFA)).toBe(5.5);
  });

  it('recusa entrada negativa', () => {
    expect(() => custoTaxi(-1, 0, 1, TARIFA)).toThrow();
    expect(() => custoTaxi(1, -5, 1, TARIFA)).toThrow();
  });
});

describe('faixaAplicativo', () => {
  it('aplica os três fatores de calibração sobre a tarifa de táxi', () => {
    const faixa = faixaAplicativo(100, TARIFA);
    expect(faixa).toEqual({ min: 68, estimado: 82, max: 110 });
  });

  it('mantém a faixa ordenada', () => {
    const faixa = faixaAplicativo(37.42, TARIFA);
    expect(faixa.min).toBeLessThanOrEqual(faixa.estimado);
    expect(faixa.estimado).toBeLessThanOrEqual(faixa.max);
  });
});

describe('estimarTrechoPorAplicativo', () => {
  it('devolve a memória de cálculo completa, para exibição na interface', () => {
    const resultado = estimarTrechoPorAplicativo(
      4,
      3,
      new Date('2026-10-21T14:00:00'),
      TARIFA,
    );

    expect(resultado.bandeira).toBe(1);
    // 5,50 + (4 × 3,20) + (0,5 × 3) = 5,50 + 12,80 + 1,50 = 19,80
    expect(resultado.calculo.subtotalTaxi).toBe(19.8);
    expect(resultado.custo.estimado).toBe(emReais(19.8 * 0.82));
    expect(resultado.calculo.norma).toBe('Tarifa de teste');
  });

  it('encarece o mesmo trecho em horário de bandeira 2', () => {
    const dia = estimarTrechoPorAplicativo(8, 0, new Date('2026-10-21T14:00:00'), TARIFA);
    const noite = estimarTrechoPorAplicativo(8, 0, new Date('2026-10-21T23:00:00'), TARIFA);
    expect(noite.custo.estimado).toBeGreaterThan(dia.custo.estimado);
  });
});

describe('mape', () => {
  it('calcula o erro percentual absoluto médio', () => {
    // Erros de 10% e 20% -> média 15%.
    const erro = mape([
      { observado: 100, estimado: 110 },
      { observado: 50, estimado: 40 },
    ]);
    expect(erro).toBeCloseTo(15, 10);
  });

  it('devolve zero quando a estimativa acerta em cheio', () => {
    expect(mape([{ observado: 42, estimado: 42 }])).toBe(0);
  });

  it('recusa amostra vazia e preço observado zero', () => {
    expect(() => mape([])).toThrow();
    expect(() => mape([{ observado: 0, estimado: 10 }])).toThrow();
  });
});
