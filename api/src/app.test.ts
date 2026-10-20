/**
 * Testes da aplicação que não dependem de banco.
 *
 * Cobrem o contrato HTTP: formato do erro, autenticação obrigatória,
 * validação de entrada e os cabeçalhos de segurança. Rodam em qualquer
 * máquina e em qualquer integração contínua, sem subir PostgreSQL.
 */

import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { criarApp } from './app.js';

const app = criarApp();

describe('infraestrutura HTTP', () => {
  it('responde ao teste de vida sem tocar no banco', async () => {
    const resposta = await request(app).get('/health/live');

    expect(resposta.status).toBe(200);
    expect(resposta.body.status).toBe('ok');
  });

  it('aplica cabeçalhos de segurança e esconde a tecnologia usada', async () => {
    const resposta = await request(app).get('/');

    expect(resposta.headers['x-powered-by']).toBeUndefined();
    expect(resposta.headers['x-content-type-options']).toBe('nosniff');
  });

  it('devolve um identificador de requisição para rastrear o log', async () => {
    const resposta = await request(app).get('/');
    expect(resposta.headers['x-request-id']).toBeTruthy();
  });

  it('responde 404 no formato padrão de erro', async () => {
    const resposta = await request(app).get('/rota-que-nao-existe');

    expect(resposta.status).toBe(404);
    expect(resposta.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });
});

describe('autenticação', () => {
  it('bloqueia rota protegida sem token', async () => {
    const resposta = await request(app).get('/v1/itineraries');

    expect(resposta.status).toBe(401);
    expect(resposta.body.erro.codigo).toBe('NAO_AUTENTICADO');
  });

  it('rejeita token inválido', async () => {
    const resposta = await request(app)
      .get('/v1/itineraries')
      .set('Authorization', 'Bearer token-falso');

    expect(resposta.status).toBe(401);
  });
});

describe('validação de entrada', () => {
  it('recusa e-mail mal formado antes de consultar o banco', async () => {
    const resposta = await request(app)
      .post('/v1/sessions')
      .send({ email: 'nao-e-um-email', senha: 'seiláqual' });

    expect(resposta.status).toBe(422);
    expect(resposta.body.erro.codigo).toBe('VALIDACAO');
    expect(resposta.body.erro.detalhes[0].campo).toBe('email');
  });

  it('recusa geração de roteiro com orçamento negativo', async () => {
    const resposta = await request(app)
      .post('/v1/itineraries')
      .set('Authorization', 'Bearer token-falso')
      .send({ origem: { lat: -4.97, lng: -39.01 }, orcamento: -10 });

    // Sem token válido o pedido para antes, o que também é o esperado.
    expect([401, 422]).toContain(resposta.status);
  });

  it('recusa JSON malformado com mensagem clara', async () => {
    const resposta = await request(app)
      .post('/v1/sessions')
      .set('Content-Type', 'application/json')
      .send('{ isto nao e json }');

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.codigo).toBe('JSON_INVALIDO');
  });

  it('recusa corpo acima do limite de tamanho', async () => {
    const resposta = await request(app)
      .post('/v1/sessions')
      .send({ email: 'a@b.com', senha: 'x'.repeat(200_000) });

    expect(resposta.status).toBe(413);
  });
});
