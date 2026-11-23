/**
 * Regras da tela Nova rota: horário de início, teto digitado e ponto de
 * partida. Os horários são do fuso de Quixadá (ver jest.fuso.js).
 */

import { ehOutroDia, emBandeira2, inicioPrevisto } from '../inicio';
import { decidirPartida } from '../partida';
import { lerTeto } from '../teto';
import type { Cidade } from '../types';

// Quarta-feira, 25 de novembro de 2026, às 16h.
const QUARTA_16H = new Date(2026, 10, 25, 16, 0);

describe('inicioPrevisto', () => {
  it('"agora" é o próprio momento', () => {
    expect(inicioPrevisto(null, QUARTA_16H)).toEqual(QUARTA_16H);
  });

  it('hora que ainda vem é hoje', () => {
    const inicio = inicioPrevisto(22.5, QUARTA_16H);
    expect(inicio).toEqual(new Date(2026, 10, 25, 22, 30));
    expect(ehOutroDia(inicio, QUARTA_16H)).toBe(false);
  });

  it('hora que já passou é amanhã', () => {
    const inicio = inicioPrevisto(9, QUARTA_16H);
    expect(inicio).toEqual(new Date(2026, 10, 26, 9, 0));
    expect(ehOutroDia(inicio, QUARTA_16H)).toBe(true);
  });

  it('com até meia hora de atraso, ainda é hoje', () => {
    const quatorzeEVinte = new Date(2026, 10, 25, 14, 20);
    expect(inicioPrevisto(14, quatorzeEVinte)).toEqual(new Date(2026, 10, 25, 14, 0));
  });

  it('bandeira 2 à noite e no domingo, como no motor', () => {
    expect(emBandeira2(new Date(2026, 10, 25, 22, 30))).toBe(true);
    expect(emBandeira2(new Date(2026, 10, 25, 14, 0))).toBe(false);
    expect(emBandeira2(new Date(2026, 10, 29, 14, 0))).toBe(true);
  });
});

describe('lerTeto', () => {
  it('campo vazio é "sem limite"', () => {
    expect(lerTeto('')).toEqual({ valor: null, erro: null, aviso: null });
  });

  it('lê o valor com vírgula', () => {
    expect(lerTeto('45,50').valor).toBe(45.5);
  });

  it('zero não vira "sem limite" calado: é um erro', () => {
    const lido = lerTeto('0');
    expect(lido.valor).toBeNull();
    expect(lido.erro).toMatch(/maior que zero/);
  });

  it('valor baixo é aceito, com aviso', () => {
    const lido = lerTeto('10');
    expect(lido.valor).toBe(10);
    expect(lido.erro).toBeNull();
    expect(lido.aviso).toMatch(/caminhadas/);
  });
});

describe('decidirPartida', () => {
  const cidade = (id: string, nome: string, lat: number, lng: number): Cidade => ({
    id,
    nome,
    uf: 'CE',
    pais: 'Brasil',
    bandeira: 'BR',
    centro: { lat, lng },
    tarifaCalibrada: true,
  });
  const cidades = [
    cidade('quixada', 'Quixadá', -4.9712, -39.0156),
    cidade('fortaleza', 'Fortaleza', -3.7319, -38.5267),
  ];
  const emQuixada = { lat: -4.975, lng: -39.02 };
  const emRecife = { lat: -8.05, lng: -34.9 };
  const base = {
    cidades,
    cidadeEscolhida: null,
    posicao: null,
    partidaManual: null,
    preferirCentro: false,
  };

  it('com GPS numa cidade atendida, parte da posição e escolhe essa cidade', () => {
    const partida = decidirPartida({ ...base, posicao: emQuixada });
    expect(partida.modo).toBe('gps');
    expect(partida.cidade?.id).toBe('quixada');
    expect(partida.origem).toEqual(emQuixada);
  });

  it('"Centro da cidade" vale sobre o GPS', () => {
    const partida = decidirPartida({ ...base, posicao: emQuixada, preferirCentro: true });
    expect(partida.modo).toBe('centro');
    expect(partida.origem).toEqual(cidades[0]!.centro);
  });

  it('ponto tocado no mapa vale sobre tudo', () => {
    const tocado = { lat: -4.96, lng: -39.01 };
    const partida = decidirPartida({ ...base, posicao: emQuixada, partidaManual: tocado });
    expect(partida.modo).toBe('manual');
    expect(partida.origem).toEqual(tocado);
  });

  it('GPS fora das cidades atendidas não é usado: parte do centro', () => {
    const partida = decidirPartida({ ...base, posicao: emRecife });
    expect(partida.gpsNaCidade).toBe(false);
    expect(partida.modo).toBe('centro');
    expect(partida.detectada?.dentroDaCobertura).toBe(false);
  });

  it('GPS em Quixadá com Fortaleza escolhida parte do centro de Fortaleza', () => {
    const partida = decidirPartida({ ...base, posicao: emQuixada, cidadeEscolhida: 'fortaleza' });
    expect(partida.modo).toBe('centro');
    expect(partida.origem).toEqual(cidades[1]!.centro);
  });

  it('avisa quando o ponto tocado fica longe demais da cidade', () => {
    const partida = decidirPartida({ ...base, partidaManual: emRecife });
    expect(partida.longeDemais).toBe(true);
  });
});
