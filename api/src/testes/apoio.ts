/**
 * Apoio aos testes de integração: banco limpo, uma cidade de teste e contas.
 */

import request from 'supertest';
import type { Express } from 'express';

import { prisma } from '@/lib/prisma.js';
import { conferirBancoDeTeste } from './banco-de-teste.js';

/** Centro de Quixadá, ponto de partida dos roteiros de teste. */
export const CENTRO = { lat: -4.9712, lng: -39.0156 };

const aNorte = (km: number) => ({ lat: CENTRO.lat + km / 111.32, lng: CENTRO.lng });

/** Apaga os dados de todas as tabelas (a estrutura fica). Só em banco de teste. */
export async function limparBanco() {
  conferirBancoDeTeste(process.env.DATABASE_URL);
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE visita, roteiro_descartado, roteiro_item, roteiro, consentimento, ' +
      'usuario, ponto_interesse, tarifa_taxi, cidade CASCADE',
  );
}

/**
 * Cidade com tarifa em vigor e quatro pontos a pé ou de carro do centro.
 * Devolve os identificadores dos pontos.
 */
export async function criarCidadeDeTeste(id = 'cidade-teste', comTarifa = true) {
  await prisma.cidade.create({
    data: { id, nome: 'Cidade Teste', uf: 'CE', pais: 'Brasil', bandeira: 'BR', ...CENTRO },
  });

  if (comTarifa) {
    await prisma.tarifaTaxi.create({
      data: {
        cidadeId: id,
        bandeirada: 5.5,
        kmBandeira1: 3.2,
        kmBandeira2: 3.9,
        horaParada: 30,
        alfa: 0.82,
        alfaP10: 0.68,
        alfaP90: 1.1,
        norma: 'Tarifa de teste',
        vigenciaInicio: new Date('2020-01-01T00:00:00Z'),
      },
    });
  }

  const pontos = [
    { id: `${id}-praca`, km: 0.3, relevancia: 4, arLivre: true },
    { id: `${id}-museu`, km: 0.6, relevancia: 5, arLivre: false },
    { id: `${id}-acude`, km: 3, relevancia: 5, arLivre: true },
    { id: `${id}-cafe`, km: 0.8, relevancia: 2, arLivre: false },
  ];
  await prisma.pontoInteresse.createMany({
    data: pontos.map((p) => ({
      id: p.id,
      cidadeId: id,
      nome: p.id,
      categoria: 'cultura',
      endereco: 'Rua de teste',
      ...aNorte(p.km),
      tempoVisitaMin: 30,
      relevancia: p.relevancia,
      arLivre: p.arLivre,
    })),
  });

  return pontos.map((p) => p.id);
}

/** Cria uma conta e devolve o token e o identificador. */
export async function criarConta(app: Express, email: string) {
  const resposta = await request(app)
    .post('/v1/users')
    .send({ nome: 'Pessoa de Teste', email, senha: 'senha-de-teste' });
  if (resposta.status !== 201) {
    throw new Error(`Cadastro falhou: ${resposta.status} ${JSON.stringify(resposta.body)}`);
  }
  return { token: resposta.body.token as string, id: resposta.body.usuario.id as string };
}

/** Pedido de roteiro de 4 horas a partir do centro, às 9h de uma quarta-feira. */
export const pedidoDeRoteiro = (parcial: Record<string, unknown> = {}) => ({
  cidadeId: 'cidade-teste',
  origem: CENTRO,
  categorias: [],
  orcamento: null,
  tempoDisponivelMin: 240,
  inicioPrevisto: '2026-10-21T12:00:00.000Z',
  ...parcial,
});
