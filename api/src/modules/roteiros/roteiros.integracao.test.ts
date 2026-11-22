/**
 * Testes de integração dos roteiros: HTTP, serviço e banco de verdade.
 */

import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { criarApp } from '@/app.js';
import { prisma } from '@/lib/prisma.js';
import { criarCidadeDeTeste, criarConta, limparBanco, pedidoDeRoteiro } from '@/testes/apoio.js';

const app = criarApp();
const comToken = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeEach(async () => {
  await limparBanco();
  await criarCidadeDeTeste();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function gerarRoteiro(token: string, parcial: Record<string, unknown> = {}) {
  const resposta = await request(app)
    .post('/v1/itineraries')
    .set(comToken(token))
    .send(pedidoDeRoteiro(parcial));
  expect(resposta.status).toBe(201);
  return resposta.body;
}

describe('gerar e consultar', () => {
  it('grava o roteiro com as paradas e devolve o mesmo na consulta e no histórico', async () => {
    const { token } = await criarConta(app, 'ana@teste.com');
    const criado = await gerarRoteiro(token);

    expect(criado.itens.length).toBeGreaterThan(0);
    // Com o servidor de rotas desligado, as distâncias são estimadas.
    expect(criado.diagnostico.rotas).toBe('estimada');
    expect(await prisma.roteiroItem.count({ where: { roteiroId: criado.id } })).toBe(
      criado.itens.length,
    );

    const lido = await request(app).get(`/v1/itineraries/${criado.id}`).set(comToken(token));
    expect(lido.status).toBe(200);
    expect(lido.body).toEqual(criado);

    const historico = await request(app).get('/v1/itineraries').set(comToken(token));
    expect(historico.body.total).toBe(1);
    expect(historico.body.itens[0].id).toBe(criado.id);
  });

  it('com teto de gasto, o custo previsto não passa dele', async () => {
    const { token } = await criarConta(app, 'ana@teste.com');
    const roteiro = await gerarRoteiro(token, { orcamento: 10 });

    expect(roteiro.orcamento).toBe(10);
    expect(roteiro.totais.custoTotal.estimado).toBeLessThanOrEqual(10);
  });

  it('recusa partida longe demais da cidade, sem gravar nada', async () => {
    const { token } = await criarConta(app, 'ana@teste.com');
    const resposta = await request(app)
      .post('/v1/itineraries')
      .set(comToken(token))
      // Fortaleza fica a cerca de 160 km de Quixadá.
      .send(pedidoDeRoteiro({ origem: { lat: -3.7319, lng: -38.5267 } }));

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.codigo).toBe('REGRA_DE_NEGOCIO');
    expect(await prisma.roteiro.count()).toBe(0);
  });

  it('recusa cidade sem tarifa de táxi, sem gravar nada', async () => {
    await criarCidadeDeTeste('sem-tarifa', false);
    const { token } = await criarConta(app, 'ana@teste.com');
    const resposta = await request(app)
      .post('/v1/itineraries')
      .set(comToken(token))
      .send(pedidoDeRoteiro({ cidadeId: 'sem-tarifa' }));

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.mensagem).toContain('tarifa');
    expect(await prisma.roteiro.count()).toBe(0);
  });
});

describe('ajustes', () => {
  it('tirar um ponto recalcula sem ele, regrava as paradas e lembra da exclusão', async () => {
    const { token } = await criarConta(app, 'ana@teste.com');
    const criado = await gerarRoteiro(token);
    const tirado = criado.itens[0].ponto.id;

    const ajustado = await request(app)
      .patch(`/v1/itineraries/${criado.id}`)
      .set(comToken(token))
      .send({ operacao: 'remover', pontoId: tirado });

    expect(ajustado.status).toBe(200);
    expect(ajustado.body.id).toBe(criado.id);
    expect(ajustado.body.itens.map((i: { ponto: { id: string } }) => i.ponto.id)).not.toContain(
      tirado,
    );
    // Sem sobras das paradas antigas.
    expect(await prisma.roteiroItem.count({ where: { roteiroId: criado.id } })).toBe(
      ajustado.body.itens.length,
    );

    // Mudar o teto depois não traz o ponto tirado de volta.
    const comTeto = await request(app)
      .patch(`/v1/itineraries/${criado.id}`)
      .set(comToken(token))
      .send({ operacao: 'orcamento', orcamento: 50 });
    expect(comTeto.body.orcamento).toBe(50);
    expect(comTeto.body.itens.map((i: { ponto: { id: string } }) => i.ponto.id)).not.toContain(
      tirado,
    );

    const semTeto = await request(app)
      .patch(`/v1/itineraries/${criado.id}`)
      .set(comToken(token))
      .send({ operacao: 'orcamento', orcamento: null });
    expect(semTeto.body.orcamento).toBeNull();
  });
});

describe('check-in', () => {
  it('marca a chegada, guarda o valor pago e pode ser desfeito', async () => {
    const { token } = await criarConta(app, 'ana@teste.com');
    const roteiro = await gerarRoteiro(token);
    const ponto = roteiro.itens[0].ponto.id;
    const url = `/v1/itineraries/${roteiro.id}`;

    const chegada = await request(app)
      .post(`${url}/checkins`)
      .set(comToken(token))
      .send({ pontoId: ponto, custoRegistrado: 12.5 });
    expect(chegada.status).toBe(201);
    expect(chegada.body.custoRegistrado).toBe(12.5);

    const depois = await request(app).get(url).set(comToken(token));
    expect(depois.body.itens[0].visitado).toBe(true);
    expect(depois.body.totais.pontosVisitados).toBe(1);
    expect(depois.body.totais.custoRegistrado).toBe(12.5);

    expect(
      (await request(app).delete(`${url}/checkins/${ponto}`).set(comToken(token))).status,
    ).toBe(204);
    const desfeito = await request(app).get(url).set(comToken(token));
    expect(desfeito.body.itens[0].visitado).toBe(false);
    expect(
      (await request(app).delete(`${url}/checkins/${ponto}`).set(comToken(token))).status,
    ).toBe(404);
  });

  it('recusa check-in em ponto que não está no roteiro', async () => {
    const { token } = await criarConta(app, 'ana@teste.com');
    const roteiro = await gerarRoteiro(token);

    const resposta = await request(app)
      .post(`/v1/itineraries/${roteiro.id}/checkins`)
      .set(comToken(token))
      .send({ pontoId: 'ponto-que-nao-existe' });
    expect(resposta.status).toBe(400);
  });

  it('o check-in continua valendo depois de ajustar o roteiro', async () => {
    const { token } = await criarConta(app, 'ana@teste.com');
    const roteiro = await gerarRoteiro(token);
    const ponto = roteiro.itens[0].ponto.id;

    await request(app)
      .post(`/v1/itineraries/${roteiro.id}/checkins`)
      .set(comToken(token))
      .send({ pontoId: ponto });
    const ajustado = await request(app)
      .patch(`/v1/itineraries/${roteiro.id}`)
      .set(comToken(token))
      .send({ operacao: 'orcamento', orcamento: null });

    const parada = ajustado.body.itens.find((i: { ponto: { id: string } }) => i.ponto.id === ponto);
    expect(parada?.visitado).toBe(true);
  });
});

describe('acesso e exclusão', () => {
  it('roteiro de outra pessoa responde como inexistente, em toda operação', async () => {
    const ana = await criarConta(app, 'ana@teste.com');
    const beto = await criarConta(app, 'beto@teste.com');
    const roteiro = await gerarRoteiro(ana.token);
    const url = `/v1/itineraries/${roteiro.id}`;
    const ponto = roteiro.itens[0].ponto.id;

    const respostas = await Promise.all([
      request(app).get(url).set(comToken(beto.token)),
      request(app)
        .patch(url)
        .set(comToken(beto.token))
        .send({ operacao: 'orcamento', orcamento: null }),
      request(app).post(`${url}/checkins`).set(comToken(beto.token)).send({ pontoId: ponto }),
      request(app).delete(url).set(comToken(beto.token)),
    ]);

    expect(respostas.map((r) => r.status)).toEqual([404, 404, 404, 404]);
    expect(await prisma.roteiro.count()).toBe(1);
  });

  it('apagar o roteiro leva junto paradas, descartados e visitas', async () => {
    const { token } = await criarConta(app, 'ana@teste.com');
    const roteiro = await gerarRoteiro(token);
    await request(app)
      .post(`/v1/itineraries/${roteiro.id}/checkins`)
      .set(comToken(token))
      .send({ pontoId: roteiro.itens[0].ponto.id });

    const apagado = await request(app).delete(`/v1/itineraries/${roteiro.id}`).set(comToken(token));
    expect(apagado.status).toBe(204);

    expect(await prisma.roteiroItem.count()).toBe(0);
    expect(await prisma.roteiroDescartado.count()).toBe(0);
    expect(await prisma.visita.count()).toBe(0);
    expect(
      (await request(app).get(`/v1/itineraries/${roteiro.id}`).set(comToken(token))).status,
    ).toBe(404);
  });
});
