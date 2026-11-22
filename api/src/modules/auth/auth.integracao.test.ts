/**
 * Testes de integração da conta: cadastro, login, aceite e exclusão (LGPD).
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
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('cadastro e login', () => {
  it('guarda o e-mail em minúsculas e aceita o login em qualquer caixa', async () => {
    await criarConta(app, 'Carla@Teste.com');
    expect((await prisma.usuario.findFirst())?.email).toBe('carla@teste.com');

    const login = await request(app)
      .post('/v1/sessions')
      .send({ email: 'CARLA@teste.com', senha: 'senha-de-teste' });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
    // A senha nunca sai da API, nem como hash.
    expect(JSON.stringify(login.body)).not.toContain('senha');
  });

  it('dá a mesma resposta para senha errada e para e-mail que não existe', async () => {
    await criarConta(app, 'carla@teste.com');

    const senhaErrada = await request(app)
      .post('/v1/sessions')
      .send({ email: 'carla@teste.com', senha: 'outra-senha' });
    const semConta = await request(app)
      .post('/v1/sessions')
      .send({ email: 'ninguem@teste.com', senha: 'outra-senha' });

    expect(senhaErrada.status).toBe(401);
    expect(semConta.status).toBe(401);
    expect(senhaErrada.body).toEqual(semConta.body);
  });

  it('não deixa cadastrar o mesmo e-mail duas vezes', async () => {
    await criarConta(app, 'carla@teste.com');
    const repetido = await request(app)
      .post('/v1/users')
      .send({ nome: 'Outra Pessoa', email: 'carla@teste.com', senha: 'senha-de-teste' });
    expect(repetido.status).toBe(409);
  });

  it('guarda o aceite da política uma vez por versão', async () => {
    const { token } = await criarConta(app, 'carla@teste.com');
    const aceite = { tipo: 'politica-privacidade', versao: '1.0' };

    expect((await request(app).post('/v1/consents').set(comToken(token)).send(aceite)).status).toBe(
      201,
    );
    expect((await request(app).post('/v1/consents').set(comToken(token)).send(aceite)).status).toBe(
      201,
    );
    expect(await prisma.consentimento.count()).toBe(1);
  });
});

describe('exclusão da conta (LGPD, art. 18)', () => {
  it('apaga roteiros, paradas, visitas e aceites, e o token deixa de valer', async () => {
    await criarCidadeDeTeste();
    const { token } = await criarConta(app, 'carla@teste.com');
    await request(app)
      .post('/v1/consents')
      .set(comToken(token))
      .send({ tipo: 'politica-privacidade', versao: '1.0' });
    const roteiro = await request(app)
      .post('/v1/itineraries')
      .set(comToken(token))
      .send(pedidoDeRoteiro());
    await request(app)
      .post(`/v1/itineraries/${roteiro.body.id}/checkins`)
      .set(comToken(token))
      .send({ pontoId: roteiro.body.itens[0].ponto.id });

    expect((await request(app).delete('/v1/me').set(comToken(token))).status).toBe(204);

    expect(await prisma.usuario.count()).toBe(0);
    expect(await prisma.roteiro.count()).toBe(0);
    expect(await prisma.roteiroItem.count()).toBe(0);
    expect(await prisma.visita.count()).toBe(0);
    expect(await prisma.consentimento.count()).toBe(0);

    // O token foi assinado antes, mas a conta não existe mais.
    expect((await request(app).get('/v1/me').set(comToken(token))).status).toBe(401);
    expect((await request(app).get('/v1/itineraries').set(comToken(token))).status).toBe(401);
  });
});
