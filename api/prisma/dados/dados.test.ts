/**
 * Conferência dos dados das cidades. Quem mudar um ponto, uma foto ou uma
 * tarifa em prisma/dados/index.ts descobre aqui se esqueceu alguma coisa.
 */

import { describe, expect, it } from 'vitest';

import { haversine } from '../../src/core/geo.js';
import { CIDADES, PONTOS, TARIFAS, emMinutos, janelaDoPonto } from './index.js';

/** O mesmo raio que a API aceita entre a partida e o centro da cidade. */
const RAIO_DA_CIDADE_KM = 60;
const HORA = /^([01]\d|2[0-4]):[0-5]\d$/;
const PREFIXO: Record<string, string> = { quixada: 'qx-', fortaleza: 'fz-' };

describe('cidades e tarifas', () => {
  it('toda cidade tem tarifa, com a faixa do aplicativo em ordem', () => {
    for (const cidade of CIDADES) {
      const tarifa = TARIFAS.find((t) => t.cidadeId === cidade.id);
      expect(tarifa, cidade.id).toBeDefined();
      expect(tarifa!.alfaP10).toBeLessThanOrEqual(tarifa!.alfa);
      expect(tarifa!.alfa).toBeLessThanOrEqual(tarifa!.alfaP90);
      expect(tarifa!.kmBandeira2).toBeGreaterThanOrEqual(tarifa!.kmBandeira1);
    }
  });
});

describe('pontos', () => {
  it('cada ponto tem identificador único, com o prefixo da sua cidade', () => {
    expect(new Set(PONTOS.map((p) => p.id)).size).toBe(PONTOS.length);
    for (const ponto of PONTOS) {
      expect(
        CIDADES.some((c) => c.id === ponto.cidadeId),
        ponto.id,
      ).toBe(true);
      expect(ponto.id.startsWith(PREFIXO[ponto.cidadeId] ?? '?'), ponto.id).toBe(true);
    }
  });

  it('fica dentro do raio da sua cidade', () => {
    for (const ponto of PONTOS) {
      const cidade = CIDADES.find((c) => c.id === ponto.cidadeId)!;
      expect(haversine(ponto, cidade), ponto.id).toBeLessThanOrEqual(RAIO_DA_CIDADE_KM);
    }
  });

  it('tem tempo de visita, faixa de preço válida e origem no OpenStreetMap', () => {
    for (const ponto of PONTOS) {
      expect(ponto.tempoVisitaMin, ponto.id).toBeGreaterThan(0);
      if (ponto.faixaPreco != null) {
        expect([0, 1, 2, 3, 4], ponto.id).toContain(ponto.faixaPreco);
      }
      expect(ponto.fonte, ponto.id).toMatch(/^osm:(node|way|relation)\/\d+$/);
    }
  });

  it('horário, quando há, é uma janela válida e diz de onde veio', () => {
    for (const ponto of PONTOS.filter((p) => p.horario)) {
      const { abre, fecha, fonte } = ponto.horario!;
      expect(abre, ponto.id).toMatch(HORA);
      expect(fecha, ponto.id).toMatch(HORA);
      expect(['osm', 'suposto'], ponto.id).toContain(fonte);
    }
  });

  it('lugar ao ar livre nunca tem janela no motor, mesmo com horário anotado', () => {
    for (const ponto of PONTOS.filter((p) => p.arLivre)) {
      expect(janelaDoPonto(ponto), ponto.id).toEqual({ abreMin: null, fechaMin: null });
    }
    const museu = PONTOS.find((p) => p.id === 'qx-museu-jacinto-sousa')!;
    expect(janelaDoPonto(museu)).toEqual({
      abreMin: emMinutos(museu.horario!.abre),
      fechaMin: emMinutos(museu.horario!.fecha),
    });
  });

  it('foto só do Wikimedia Commons, com licença livre e crédito', () => {
    for (const ponto of PONTOS.filter((p) => p.foto)) {
      const { url, credito, fonte } = ponto.foto!;
      expect(url, ponto.id).toMatch(/^https:\/\/thumb\.wikimedia\.org\//);
      expect(fonte, ponto.id).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(credito, ponto.id).toMatch(/domínio público|CC0|CC BY/);
      expect(credito, ponto.id).toContain('Wikimedia Commons');
    }
  });

  it('cada cidade tem ao menos um símbolo (relevância 5), que o motor escolhe primeiro', () => {
    for (const cidade of CIDADES) {
      expect(
        PONTOS.some((p) => p.cidadeId === cidade.id && p.relevancia === 5),
        cidade.id,
      ).toBe(true);
    }
  });
});
