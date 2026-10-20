/**
 * Testes do motor de roteirização.
 *
 * Cobrem o comportamento que sustenta as hipóteses do trabalho: respeitar o
 * orçamento, respeitar o tempo, respeitar o horário de funcionamento e
 * explicar o que foi descartado.
 */

import { describe, expect, it } from 'vitest';

import {
  cabeNaJanela,
  custoNoLocal,
  gerarRoteiro,
  type Candidato,
  type Preferencias,
} from './roteirizacao.js';
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

function candidato(parcial: Partial<Candidato> & { id: string }): Candidato {
  return {
    nome: `Ponto ${parcial.id}`,
    categoria: 'cultura',
    coordenada: CENTRO,
    nota: 4.5,
    avaliacoes: 500,
    faixaPreco: null,
    tempoVisitaMin: 30,
    abreMin: null,
    fechaMin: null,
    ...parcial,
  };
}

/** Desloca uma coordenada alguns quilômetros para o norte. */
const aNorte = (km: number) => ({ lat: CENTRO.lat + km / 111.32, lng: CENTRO.lng });

const preferencias = (parcial: Partial<Preferencias> = {}): Preferencias => ({
  origem: CENTRO,
  categorias: [],
  orcamento: 100,
  tempoDisponivelMin: 240,
  inicioPrevisto: new Date('2026-10-21T09:00:00'),
  ...parcial,
});

describe('custoNoLocal', () => {
  it('converte a faixa de preço do provedor em reais', () => {
    expect(custoNoLocal(candidato({ id: 'a', faixaPreco: null }))).toBe(0);
    expect(custoNoLocal(candidato({ id: 'b', faixaPreco: 2 }))).toBe(45);
  });
});

describe('cabeNaJanela', () => {
  const museu = candidato({ id: 'museu', abreMin: 8 * 60, fechaMin: 17 * 60, tempoVisitaMin: 60 });

  it('aceita visita que começa e termina dentro do horário', () => {
    expect(cabeNaJanela(museu, new Date('2026-10-21T10:00:00'), 0)).toBe(true);
  });

  it('recusa chegada antes da abertura', () => {
    expect(cabeNaJanela(museu, new Date('2026-10-21T07:00:00'), 0)).toBe(false);
  });

  it('recusa visita que ultrapassaria o fechamento', () => {
    expect(cabeNaJanela(museu, new Date('2026-10-21T16:30:00'), 0)).toBe(false);
  });

  it('considera ponto sem horário como sempre aberto', () => {
    const praca = candidato({ id: 'praca' });
    expect(cabeNaJanela(praca, new Date('2026-10-21T03:00:00'), 0)).toBe(true);
  });
});

describe('gerarRoteiro', () => {
  it('não ultrapassa o orçamento informado', () => {
    const candidatos = [3, 6, 9, 12].map((km, i) =>
      candidato({ id: `p${i}`, coordenada: aNorte(km) }),
    );

    const resultado = gerarRoteiro(candidatos, preferencias({ orcamento: 30 }), TARIFA);
    const total =
      resultado.totais.custoTransporte.estimado + resultado.totais.custoLocais;

    expect(total).toBeLessThanOrEqual(30);
  });

  it('não ultrapassa o tempo disponível', () => {
    const candidatos = [2, 4, 6, 8].map((km, i) =>
      candidato({ id: `p${i}`, coordenada: aNorte(km), tempoVisitaMin: 60 }),
    );

    const resultado = gerarRoteiro(
      candidatos,
      preferencias({ tempoDisponivelMin: 120 }),
      TARIFA,
    );

    expect(resultado.totais.duracaoMin).toBeLessThanOrEqual(120);
  });

  it('aumenta o número de paradas quando o orçamento cresce', () => {
    const candidatos = [3, 6, 9, 12, 15].map((km, i) =>
      candidato({ id: `p${i}`, coordenada: aNorte(km) }),
    );

    const pobre = gerarRoteiro(candidatos, preferencias({ orcamento: 25 }), TARIFA);
    const rico = gerarRoteiro(candidatos, preferencias({ orcamento: 300 }), TARIFA);

    expect(rico.itens.length).toBeGreaterThan(pobre.itens.length);
  });

  it('explica o motivo de cada ponto descartado', () => {
    const candidatos = [
      candidato({ id: 'perto', coordenada: aNorte(0.5) }),
      candidato({ id: 'caro', coordenada: aNorte(40) }),
    ];

    const resultado = gerarRoteiro(candidatos, preferencias({ orcamento: 20 }), TARIFA);
    const descartado = resultado.descartados.find((d) => d.candidato.id === 'caro');

    expect(descartado?.motivo).toBe('orcamento');
    expect(descartado?.detalhe).toMatch(/faltariam R\$/);
  });

  it('descarta por horário o ponto que já estará fechado', () => {
    const candidatos = [
      candidato({
        id: 'museu',
        coordenada: aNorte(0.3),
        abreMin: 8 * 60,
        fechaMin: 17 * 60,
      }),
    ];

    const resultado = gerarRoteiro(
      candidatos,
      preferencias({ inicioPrevisto: new Date('2026-10-21T22:00:00') }),
      TARIFA,
    );

    expect(resultado.itens).toHaveLength(0);
    expect(resultado.descartados[0]?.motivo).toBe('horario');
  });

  it('usa caminhada, sem custo, em trechos curtos', () => {
    const candidatos = [candidato({ id: 'vizinho', coordenada: aNorte(0.4) })];

    const resultado = gerarRoteiro(candidatos, preferencias(), TARIFA);

    expect(resultado.itens[0]?.trechoAteAqui.modal).toBe('pe');
    expect(resultado.itens[0]?.trechoAteAqui.custo.estimado).toBe(0);
    expect(resultado.totais.trechosAPe).toBe(1);
    expect(resultado.totais.economiaCaminhando).toBeGreaterThan(0);
  });

  it('prefere pontos das categorias escolhidas pelo usuário', () => {
    const candidatos = [
      candidato({ id: 'museu', categoria: 'cultura', coordenada: aNorte(5) }),
      candidato({ id: 'restaurante', categoria: 'gastronomia', coordenada: aNorte(5.05) }),
    ];

    const resultado = gerarRoteiro(
      candidatos,
      preferencias({ categorias: ['gastronomia'], orcamento: 40 }),
      TARIFA,
    );

    expect(resultado.itens[0]?.candidato.id).toBe('restaurante');
  });

  it('devolve roteiro vazio, e não erro, quando nada cabe', () => {
    const candidatos = [candidato({ id: 'longe', coordenada: aNorte(50) })];

    const resultado = gerarRoteiro(candidatos, preferencias({ orcamento: 5 }), TARIFA);

    expect(resultado.itens).toHaveLength(0);
    expect(resultado.descartados).toHaveLength(1);
    expect(resultado.totais.custoTransporte.estimado).toBe(0);
  });

  it('mantém os horários da sequência coerentes entre si', () => {
    const candidatos = [3, 6, 9].map((km, i) =>
      candidato({ id: `p${i}`, coordenada: aNorte(km), tempoVisitaMin: 30 }),
    );

    const resultado = gerarRoteiro(candidatos, preferencias({ orcamento: 500 }), TARIFA);

    for (let i = 1; i < resultado.itens.length; i++) {
      const anterior = resultado.itens[i - 1]!;
      const atual = resultado.itens[i]!;
      expect(atual.chegadaPrevista.getTime()).toBeGreaterThanOrEqual(
        anterior.saidaPrevista.getTime(),
      );
    }
  });

  it('informa as métricas de processamento', () => {
    const candidatos = [1, 2, 3].map((km, i) =>
      candidato({ id: `p${i}`, coordenada: aNorte(km) }),
    );

    const resultado = gerarRoteiro(candidatos, preferencias(), TARIFA);

    expect(resultado.diagnostico.candidatosAvaliados).toBe(3);
    expect(resultado.diagnostico.trechosCalculados).toBeGreaterThan(0);
    expect(resultado.diagnostico.duracaoMs).toBeGreaterThanOrEqual(0);
  });
});
