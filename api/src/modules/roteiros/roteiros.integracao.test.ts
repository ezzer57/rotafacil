/**
 * Testes de integração dos roteiros: HTTP, serviço e banco de verdade.
 */

import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { criarApp } from '@/app.js';
import { prisma } from '@/lib/prisma.js';
import {
  CENTRO,
  criarCidadeDeTeste,
  criarConta,
  limparBanco,
  pedidoDeRoteiro,
} from '@/testes/apoio.js';

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

    // A parada feita fica na frente, e o resto é refeito depois dela.
    expect(ajustado.body.itens[0].ponto.id).toBe(ponto);
    expect(ajustado.body.itens[0].visitado).toBe(true);
    expect(ajustado.body.itens[1]?.trechoAteAqui.origemId).toBe(ponto);
  });
});

describe('recalcular daqui', () => {
  /** Posição da pessoa na hora do recálculo: 2,5 km ao norte do centro. */
  const AQUI = { lat: CENTRO.lat + 2.5 / 111.32, lng: CENTRO.lng };

  interface Item {
    ponto: { id: string; coordenada: { lat: number; lng: number } };
    custoNoLocal: number;
    chegadaPrevista: string;
    visita: { custoRegistrado: number | null } | null;
    trechoAteAqui: {
      origemId: string;
      partida: { lat: number; lng: number } | null;
      custo: { estimado: number };
    } | null;
  }

  async function chegar(token: string, roteiroId: string, pontoId: string, custo?: number) {
    const resposta = await request(app)
      .post(`/v1/itineraries/${roteiroId}/checkins`)
      .set(comToken(token))
      .send({ pontoId, custoRegistrado: custo });
    expect(resposta.status).toBe(201);
  }

  const recalcular = (token: string, roteiroId: string, corpo: Record<string, unknown>) =>
    request(app).post(`/v1/itineraries/${roteiroId}/recalculate`).set(comToken(token)).send(corpo);

  it('mantém a parada feita, parte da posição, agora, e não repete lugar', async () => {
    const { token } = await criarConta(app, 'ana@teste.com');
    const roteiro = await gerarRoteiro(token);
    const feita = roteiro.itens[0].ponto.id;
    await chegar(token, roteiro.id, feita, 9);

    const antes = Date.now();
    const resposta = await recalcular(token, roteiro.id, { origem: AQUI, tempoDisponivelMin: 120 });
    expect(resposta.status).toBe(200);
    const itens: Item[] = resposta.body.itens;

    // A parada feita fica na frente, com a visita.
    expect(itens[0]!.ponto.id).toBe(feita);
    expect(itens[0]!.visita?.custoRegistrado).toBe(9);
    // O resto não repete lugar e sai da posição informada, a partir de agora.
    expect(itens.length).toBeGreaterThan(1);
    expect(itens.slice(1).map((i) => i.ponto.id)).not.toContain(feita);
    expect(itens[1]!.trechoAteAqui?.partida).toEqual(AQUI);
    expect(itens[1]!.trechoAteAqui?.origemId).toBe('posicao');
    expect(new Date(itens[1]!.chegadaPrevista).getTime()).toBeGreaterThanOrEqual(antes);

    expect(resposta.body.recalculo).toMatchObject({
      origem: AQUI,
      tempoDisponivelMin: 120,
      de: 'posicao',
    });
    // O pedido original continua o mesmo.
    expect(resposta.body.preferencias.origem).toEqual(CENTRO);
    expect(resposta.body.tempoDisponivelMin).toBe(240);

    // Gravado assim: a consulta devolve o mesmo, sem paradas sobrando.
    const lido = await request(app).get(`/v1/itineraries/${roteiro.id}`).set(comToken(token));
    expect(lido.body).toEqual(resposta.body);
    expect(await prisma.roteiroItem.count({ where: { roteiroId: roteiro.id } })).toBe(itens.length);
  });

  it('sem a posição, parte da última parada em que a pessoa chegou', async () => {
    const { token } = await criarConta(app, 'ana@teste.com');
    const roteiro = await gerarRoteiro(token);
    const feita = roteiro.itens[0];
    await chegar(token, roteiro.id, feita.ponto.id);

    const resposta = await recalcular(token, roteiro.id, { tempoDisponivelMin: 120 });
    expect(resposta.status).toBe(200);

    expect(resposta.body.recalculo).toMatchObject({
      de: 'ultima-parada',
      origem: feita.ponto.coordenada,
    });
    const seguinte: Item = resposta.body.itens[1];
    expect(seguinte.trechoAteAqui?.partida).toBeNull();
    expect(seguinte.trechoAteAqui?.origemId).toBe(feita.ponto.id);
  });

  it('com teto, o resto cabe no que sobra dele depois do que já foi gasto', async () => {
    const { token } = await criarConta(app, 'ana@teste.com');
    const roteiro = await gerarRoteiro(token, { orcamento: 30 });
    const feita = roteiro.itens[0];
    await chegar(token, roteiro.id, feita.ponto.id, 10);

    const resposta = await recalcular(token, roteiro.id, { origem: AQUI, tempoDisponivelMin: 180 });
    const itens: Item[] = resposta.body.itens;
    const gastoDoResto = itens
      .slice(1)
      .reduce((s, i) => s + (i.trechoAteAqui?.custo.estimado ?? 0) + i.custoNoLocal, 0);

    expect(resposta.body.orcamento).toBe(30);
    expect(gastoDoResto).toBeLessThanOrEqual(30 - 10 - feita.custoNoLocal + 0.01);
  });

  it('recusa posição longe da cidade, sem mexer no roteiro', async () => {
    const { token } = await criarConta(app, 'ana@teste.com');
    const roteiro = await gerarRoteiro(token);

    const resposta = await recalcular(token, roteiro.id, {
      origem: { lat: -3.7319, lng: -38.5267 },
      tempoDisponivelMin: 120,
    });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.codigo).toBe('REGRA_DE_NEGOCIO');
    expect(resposta.body.erro.mensagem).toContain('"Recalcular daqui" só funciona perto da cidade');

    const lido = await request(app).get(`/v1/itineraries/${roteiro.id}`).set(comToken(token));
    expect(lido.body).toEqual(roteiro);
  });

  it('depois do recálculo, tirar um ponto mantém a parada feita e a partida do recálculo', async () => {
    const { token } = await criarConta(app, 'ana@teste.com');
    const roteiro = await gerarRoteiro(token);
    const feita = roteiro.itens[0].ponto.id;
    await chegar(token, roteiro.id, feita);
    const recalculado = (
      await recalcular(token, roteiro.id, { origem: AQUI, tempoDisponivelMin: 180 })
    ).body;
    const tirado = recalculado.itens[1].ponto.id;

    const ajustado = await request(app)
      .patch(`/v1/itineraries/${roteiro.id}`)
      .set(comToken(token))
      .send({ operacao: 'remover', pontoId: tirado });
    expect(ajustado.status).toBe(200);
    const itens: Item[] = ajustado.body.itens;

    expect(itens[0]!.ponto.id).toBe(feita);
    expect(itens[0]!.visita).not.toBeNull();
    expect(itens.map((i) => i.ponto.id)).not.toContain(tirado);
    expect(ajustado.body.recalculo).toEqual(recalculado.recalculo);
    // Ninguém chegou em lugar nenhum depois do recálculo: o resto sai de onde ele saiu.
    expect(itens.length).toBeGreaterThan(1);
    expect(itens[1]!.trechoAteAqui?.partida).toEqual(AQUI);
  });

  it('não deixa tirar uma parada em que a pessoa já chegou', async () => {
    const { token } = await criarConta(app, 'ana@teste.com');
    const roteiro = await gerarRoteiro(token);
    const feita = roteiro.itens[0].ponto.id;
    await chegar(token, roteiro.id, feita);

    const resposta = await request(app)
      .patch(`/v1/itineraries/${roteiro.id}`)
      .set(comToken(token))
      .send({ operacao: 'remover', pontoId: feita });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.codigo).toBe('REGRA_DE_NEGOCIO');
  });

  it('recusa tempo fora da faixa, como dado inválido', async () => {
    const { token } = await criarConta(app, 'ana@teste.com');
    const roteiro = await gerarRoteiro(token);

    const resposta = await recalcular(token, roteiro.id, { origem: AQUI, tempoDisponivelMin: 10 });
    expect(resposta.status).toBe(422);
    expect(resposta.body.erro.codigo).toBe('VALIDACAO');
    expect(JSON.stringify(resposta.body.erro.detalhes)).toContain('30 minutos');
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
      request(app)
        .post(`${url}/recalculate`)
        .set(comToken(beto.token))
        .send({ tempoDisponivelMin: 120 }),
      request(app).delete(url).set(comToken(beto.token)),
    ]);

    expect(respostas.map((r) => r.status)).toEqual([404, 404, 404, 404, 404]);
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
