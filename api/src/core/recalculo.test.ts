/**
 * Testes do recálculo de um roteiro em andamento: o que sobra de tempo e de
 * dinheiro, de onde o resto parte e como as paradas feitas ficam.
 */

import { describe, expect, it } from 'vitest';

import {
  gastoAteAgora,
  orcamentoQueSobra,
  partidaDoAjuste,
  partidaDoRecalculo,
  partidaPropriaDoResto,
  refazerORestante,
  tempoQueSobra,
  type BaseDoPlano,
  type ParadaFeita,
} from './recalculo.js';
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

const CENTRO = { lat: -4.9712, lng: -39.0156 };
const aNorte = (km: number) => ({ lat: CENTRO.lat + km / 111.32, lng: CENTRO.lng });

function candidato(id: string, km: number, parcial: Partial<Candidato> = {}): Candidato {
  return {
    id,
    nome: `Ponto ${id}`,
    categoria: 'cultura',
    coordenada: aNorte(km),
    nota: 4.5,
    avaliacoes: 500,
    faixaPreco: null,
    tempoVisitaMin: 30,
    relevancia: 3,
    arLivre: true,
    abreMin: null,
    fechaMin: null,
    ...parcial,
  };
}

const CANDIDATOS = [
  candidato('praca', 0.3, { relevancia: 5 }),
  candidato('museu', 0.6, { faixaPreco: 1 }),
  candidato('acude', 3),
  candidato('mirante', 5),
  candidato('cafe', 0.8, { faixaPreco: 1 }),
];

const INICIO = new Date('2026-10-21T09:00:00');
const minutos = (data: Date, n: number) => new Date(data.getTime() + n * 60_000);

const pedido = (parcial: Partial<Preferencias> = {}): Preferencias => ({
  origem: CENTRO,
  categorias: [],
  orcamento: null,
  tempoDisponivelMin: 240,
  inicioPrevisto: INICIO,
  ...parcial,
});

const BASE: BaseDoPlano = {
  origem: CENTRO,
  inicio: INICIO,
  tempoDisponivelMin: 240,
  recalculadoEm: null,
};

/** As `n` primeiras paradas de um roteiro gerado, como se a pessoa tivesse chegado nelas. */
function primeirasFeitas(n: number, custoRegistrado: number | null = null): ParadaFeita[] {
  const { itens } = gerarRoteiro(CANDIDATOS, pedido(), TARIFA);
  return itens.slice(0, n).map((item) => ({
    item,
    chegadaEm: item.chegadaPrevista,
    custoRegistrado,
  }));
}

describe('gasto e orçamento que sobra', () => {
  it('conta a corrida pelo valor pago, quando há, e a entrada de cada lugar', () => {
    const [feita] = primeirasFeitas(1);
    const estimada = feita!.item.trechoAteAqui.custo.estimado + feita!.item.custoNoLocal;

    expect(gastoAteAgora([feita!])).toBeCloseTo(estimada, 2);
    expect(gastoAteAgora([{ ...feita!, custoRegistrado: 20 }])).toBeCloseTo(
      20 + feita!.item.custoNoLocal,
      2,
    );
  });

  it('sem teto continua sem teto; com teto, desconta o gasto e nunca fica negativo', () => {
    const feitas = primeirasFeitas(1, 15);
    expect(orcamentoQueSobra(null, feitas)).toBeNull();
    expect(orcamentoQueSobra(50, feitas)).toBeCloseTo(50 - gastoAteAgora(feitas), 2);
    expect(orcamentoQueSobra(5, feitas)).toBe(0);
  });
});

describe('tempo que sobra', () => {
  it('é o que falta até o fim previsto, e zero depois dele', () => {
    expect(tempoQueSobra(BASE, minutos(INICIO, 90))).toBe(150);
    expect(tempoQueSobra(BASE, minutos(INICIO, 300))).toBe(0);
  });

  it('antes da hora de começar, não passa do tempo do plano', () => {
    expect(tempoQueSobra(BASE, minutos(INICIO, -600))).toBe(240);
  });
});

describe('de onde o resto parte', () => {
  it('no ajuste sem chegada nenhuma, da mesma partida de antes', () => {
    expect(partidaDoAjuste(BASE, [])).toEqual({
      origem: CENTRO,
      inicio: INICIO,
      tempoDisponivelMin: 240,
    });
  });

  it('no ajuste depois de uma chegada, da última parada feita, com o tempo que sobra', () => {
    const feitas = primeirasFeitas(2);
    const ultima = feitas[1]!.item;
    const partida = partidaDoAjuste(BASE, feitas);

    expect(partida.origem).toEqual(ultima.candidato.coordenada);
    expect(partida.inicio).toEqual(ultima.saidaPrevista);
    expect(partida.tempoDisponivelMin).toBe(tempoQueSobra(BASE, ultima.saidaPrevista));
  });

  it('no ajuste depois de um "Recalcular daqui", da posição do recálculo se ninguém chegou depois', () => {
    const feitas = primeirasFeitas(1);
    const recalculo: BaseDoPlano = {
      origem: aNorte(2),
      inicio: minutos(INICIO, 120),
      tempoDisponivelMin: 60,
      recalculadoEm: minutos(INICIO, 120),
    };
    expect(partidaDoAjuste(recalculo, feitas).origem).toEqual(aNorte(2));
  });

  it('no "Recalcular daqui", da posição; sem ela, da última parada feita; sem nenhuma, da partida', () => {
    const feitas = primeirasFeitas(1);
    expect(partidaDoRecalculo(aNorte(4), BASE, feitas)).toEqual({
      origem: aNorte(4),
      de: 'posicao',
    });
    expect(partidaDoRecalculo(null, BASE, feitas)).toEqual({
      origem: feitas[0]!.item.candidato.coordenada,
      de: 'ultima-parada',
    });
    expect(partidaDoRecalculo(null, BASE, [])).toEqual({ origem: CENTRO, de: 'partida' });
  });
});

describe('partidaPropriaDoResto', () => {
  it('só existe quando o resto não sai do ponto anterior da lista', () => {
    const feitas = primeirasFeitas(1);
    const ultima = feitas[0]!.item.candidato.coordenada;

    expect(partidaPropriaDoResto(feitas, CENTRO, ultima)).toBeNull();
    expect(partidaPropriaDoResto([], CENTRO, CENTRO)).toBeNull();
    expect(partidaPropriaDoResto(feitas, CENTRO, aNorte(4))).toEqual(aNorte(4));
    expect(partidaPropriaDoResto([], CENTRO, aNorte(4))).toEqual(aNorte(4));
  });
});

describe('refazerORestante', () => {
  const feitas = primeirasFeitas(1, 12);
  const momento = minutos(INICIO, 150);
  const resto = pedido({ origem: aNorte(4), inicioPrevisto: momento, tempoDisponivelMin: 90 });
  const resultado = refazerORestante(feitas, CANDIDATOS, resto, TARIFA);

  it('mantém as paradas feitas na frente, como estavam', () => {
    expect(resultado.itens[0]).toEqual({ ...feitas[0]!.item, ordem: 1 });
  });

  it('não repete lugar visitado e numera o resto em seguida', () => {
    const visitado = feitas[0]!.item.candidato.id;
    const resto = resultado.itens.slice(1);
    expect(resto.length).toBeGreaterThan(0);
    expect(resto.map((i) => i.candidato.id)).not.toContain(visitado);
    expect(resultado.itens.map((i) => i.ordem)).toEqual(resultado.itens.map((_, i) => i + 1));
  });

  it('planeja o resto a partir da nova partida e do momento do recálculo', () => {
    const primeiraNova = resultado.itens[1]!;
    expect(primeiraNova.chegadaPrevista.getTime()).toBeGreaterThanOrEqual(momento.getTime());
    const fimDoResto = minutos(momento, 90).getTime();
    expect(resultado.itens.at(-1)!.saidaPrevista.getTime()).toBeLessThanOrEqual(fimDoResto);
  });

  it('soma as duas partes nos totais', () => {
    const custoLocais = resultado.itens.reduce((s, i) => s + i.custoNoLocal, 0);
    expect(resultado.totais.custoLocais).toBeCloseTo(custoLocais, 2);
    const transporte = resultado.itens.reduce((s, i) => s + i.trechoAteAqui.custo.estimado, 0);
    expect(resultado.totais.custoTransporte.estimado).toBeCloseTo(transporte, 2);
  });

  it('com teto, o resto cabe no que sobra dele', () => {
    const teto = orcamentoQueSobra(30, feitas)!;
    const comTeto = refazerORestante(feitas, CANDIDATOS, { ...resto, orcamento: teto }, TARIFA);
    const gastoDoResto = comTeto.itens
      .slice(1)
      .reduce((s, i) => s + i.trechoAteAqui.custo.estimado + i.custoNoLocal, 0);
    expect(gastoDoResto).toBeLessThanOrEqual(teto);
  });
});
