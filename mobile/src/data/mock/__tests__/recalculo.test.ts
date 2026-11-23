/**
 * O recálculo no modo de demonstração responde como a API: as paradas feitas
 * ficam, o resto é refeito e os mesmos erros voltam.
 */

import type { Roteiro } from '@/domain/types';
import { cidadeDoMock } from '../dados';
import { createServicosMock } from '../index';

jest.setTimeout(20_000);

const CENTRO = cidadeDoMock('quixada').centro;
/** 2 km ao norte do centro de Quixadá. */
const AQUI = { lat: CENTRO.lat + 2 / 111.32, lng: CENTRO.lng };

async function roteiroComUmaChegada() {
  const servicos = createServicosMock();
  const roteiro = await servicos.roteiros.gerar({
    cidadeId: 'quixada',
    origem: CENTRO,
    categorias: ['natureza', 'cultura'],
    orcamento: null,
    tempoDisponivelMin: 300,
    inicioPrevisto: new Date().toISOString(),
  });
  expect(roteiro.itens.length).toBeGreaterThan(2);
  const feita = roteiro.itens[0]!.ponto.id;
  await servicos.roteiros.registrarVisita(roteiro.id, feita, 12);
  return { servicos, roteiro, feita };
}

const ids = (roteiro: Roteiro) => roteiro.itens.map((item) => item.ponto.id);

it('o ajuste depois de um check-in mantém a parada feita na frente, e ela não se tira', async () => {
  const { servicos, roteiro, feita } = await roteiroComUmaChegada();
  const tirado = roteiro.itens[1]!.ponto.id;

  const ajustado = await servicos.roteiros.removerPonto(roteiro.id, tirado);
  expect(ajustado.itens[0]!.ponto.id).toBe(feita);
  expect(ajustado.itens[0]!.visita?.custoRegistrado).toBe(12);
  expect(ids(ajustado)).not.toContain(tirado);

  await expect(servicos.roteiros.removerPonto(roteiro.id, feita)).rejects.toMatchObject({
    status: 400,
  });
});

it('o "Recalcular daqui" parte da posição, agora, sem repetir lugar', async () => {
  const { servicos, roteiro, feita } = await roteiroComUmaChegada();

  const recalculado = await servicos.roteiros.recalcularDaqui(roteiro.id, {
    origem: AQUI,
    tempoDisponivelMin: 120,
  });

  expect(recalculado.id).toBe(roteiro.id);
  expect(recalculado.recalculo).toMatchObject({
    de: 'posicao',
    origem: AQUI,
    tempoDisponivelMin: 120,
  });
  expect(recalculado.itens[0]!.ponto.id).toBe(feita);
  expect(ids(recalculado).slice(1)).not.toContain(feita);
  expect(recalculado.itens[1]!.trechoAteAqui).toMatchObject({ origemId: 'posicao', partida: AQUI });
  expect(await servicos.roteiros.obter(roteiro.id)).toEqual(recalculado);
});

it('sem a posição, parte da última parada feita; longe da cidade, recusa', async () => {
  const { servicos, roteiro } = await roteiroComUmaChegada();

  const semPosicao = await servicos.roteiros.recalcularDaqui(roteiro.id, {
    origem: null,
    tempoDisponivelMin: 120,
  });
  expect(semPosicao.recalculo?.de).toBe('ultima-parada');
  expect(semPosicao.itens[1]?.trechoAteAqui?.partida ?? null).toBeNull();

  await expect(
    servicos.roteiros.recalcularDaqui(roteiro.id, {
      origem: { lat: -3.7319, lng: -38.5267 },
      tempoDisponivelMin: 120,
    }),
  ).rejects.toMatchObject({
    status: 400,
    message: expect.stringContaining('"Recalcular daqui" só funciona perto da cidade'),
  });
});
