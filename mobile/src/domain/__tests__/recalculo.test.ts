/**
 * Regras do "Recalcular daqui" na tela. Horários no fuso de Quixadá (ver
 * jest.fuso.js): o roteiro de exemplo começa às 9h, com 4 horas livres.
 */

import { roteiroDeExemplo } from '@/testes/roteiro-de-exemplo';
import { descreverRecalculo, opcoesDeTempo } from '../recalculo';

/** Uma hora do dia 25/11/2026 em Quixadá (UTC-3). */
const as = (hora: string) => new Date(`2026-11-25T${hora}:00-03:00`);

describe('opcoesDeTempo', () => {
  it('oferece primeiro o que sobra do plano, já marcado, até a hora em que ele terminaria', () => {
    const { opcoes, padrao } = opcoesDeTempo(roteiroDeExemplo(), as('11:47'));

    expect(opcoes[0]).toEqual({ minutos: 70, rotulo: 'Até as 13:00 (1h10)' });
    expect(padrao).toBe(70);
    expect(opcoes.slice(1).map((o) => o.rotulo)).toEqual(['1h', '2h', '3h', '4h']);
  });

  it('sem uma hora repetida quando o que sobra é uma hora cheia', () => {
    const { opcoes } = opcoesDeTempo(roteiroDeExemplo(), as('11:00'));
    expect(opcoes.map((o) => o.minutos)).toEqual([120, 60, 180, 240]);
  });

  it('quando o plano já acabou (ou falta pouco), vêm as horas cheias, com 2h marcadas', () => {
    const { opcoes, padrao } = opcoesDeTempo(roteiroDeExemplo(), as('12:45'));
    expect(opcoes.map((o) => o.minutos)).toEqual([60, 120, 180, 240]);
    expect(padrao).toBe(120);
  });

  it('depois de um recálculo, conta a partir dele', () => {
    const roteiro = roteiroDeExemplo({
      recalculo: {
        em: as('11:00').toISOString(),
        origem: { lat: -4.97, lng: -39.01 },
        tempoDisponivelMin: 180,
        de: 'posicao',
      },
    });
    expect(opcoesDeTempo(roteiro, as('12:30')).opcoes[0]).toEqual({
      minutos: 90,
      rotulo: 'Até as 14:00 (1h30)',
    });
  });
});

describe('descreverRecalculo', () => {
  const recalculo = {
    em: as('14:20').toISOString(),
    origem: { lat: -4.97, lng: -39.01 },
    tempoDisponivelMin: 120,
  };

  it('diz quando, de onde e com quanto tempo o resto foi refeito', () => {
    expect(descreverRecalculo({ ...recalculo, de: 'posicao' })).toBe(
      'Refeito às 14:20, a partir de onde você estava, com 2h livres.',
    );
  });

  it('avisa quando foi sem a localização, e de onde o resto saiu', () => {
    expect(descreverRecalculo({ ...recalculo, de: 'ultima-parada' })).toBe(
      'Refeito às 14:20 sem a sua localização: o resto saiu da última parada em que você chegou, com 2h livres.',
    );
    expect(descreverRecalculo({ ...recalculo, de: 'partida' })).toContain(
      'saiu do ponto de partida do roteiro',
    );
  });
});
