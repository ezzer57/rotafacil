/**
 * O modo de demonstração lê os dados da API (api/prisma/dados) e só traduz
 * para os tipos do aplicativo. Estes testes conferem a tradução.
 */

import { PONTOS as PONTOS_DADOS, janelaDoPonto } from '@dados/index';

import { CIDADES, PONTOS, janelaDoMock, pontosPorCidade, tarifaDoMock } from '../dados';

describe('dados do modo de demonstração', () => {
  it('tem os mesmos pontos da fonte única, sem cópia', () => {
    expect(PONTOS.map((p) => p.id)).toEqual(PONTOS_DADOS.map((p) => p.id));
    expect(pontosPorCidade('quixada').length + pontosPorCidade('fortaleza').length).toBe(
      PONTOS.length,
    );
  });

  it('escreve o horário como a API: janela, ar livre ou aberto o dia todo', () => {
    const museu = PONTOS.find((p) => p.id === 'qx-museu-jacinto-sousa')!;
    const acude = PONTOS.find((p) => p.id === 'qx-acude-cedro')!;

    expect(museu.horarioHoje).toMatch(/^\d{2}:\d{2} às \d{2}:\d{2}$/);
    expect(acude.horarioHoje).toBe('Ao ar livre, sem horário');
  });

  it('passa ao motor a mesma janela de horário da carga do banco', () => {
    for (const ponto of PONTOS_DADOS) {
      expect(janelaDoMock(ponto.id)).toEqual(janelaDoPonto(ponto));
    }
  });

  it('toda cidade tem tarifa', () => {
    for (const cidade of CIDADES) {
      expect(cidade.tarifaCalibrada).toBe(true);
      expect(tarifaDoMock(cidade.id).cidadeId).toBe(cidade.id);
    }
  });
});
