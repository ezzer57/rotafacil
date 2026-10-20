/**
 * Ponto de entrada do servidor.
 *
 * Cuida do ciclo de vida do processo: sobe, escuta e desliga com ordem.
 * O desligamento gracioso evita derrubar requisição em andamento quando o
 * provedor reinicia o serviço durante um novo deploy.
 */

import { createServer } from 'node:http';

import { criarApp } from '@/app.js';
import { env } from '@/config/env.js';
import { logger } from '@/lib/logger.js';
import { prisma } from '@/lib/prisma.js';

const servidor = createServer(criarApp());

servidor.listen(env.PORT, () => {
  logger.info(
    { porta: env.PORT, ambiente: env.NODE_ENV },
    `RotaFácil API no ar em http://localhost:${env.PORT}`,
  );
});

/** Tempo máximo para as requisições em andamento terminarem. */
const PRAZO_DESLIGAMENTO_MS = 10_000;

async function desligar(sinal: string) {
  logger.info({ sinal }, 'Desligando o servidor');

  const prazo = setTimeout(() => {
    logger.error('Desligamento demorou demais, encerrando à força');
    process.exit(1);
  }, PRAZO_DESLIGAMENTO_MS);

  try {
    await new Promise<void>((resolver, rejeitar) => {
      servidor.close((erro) => (erro ? rejeitar(erro) : resolver()));
    });
    await prisma.$disconnect();
    clearTimeout(prazo);
    logger.info('Servidor encerrado com tudo fechado');
    process.exit(0);
  } catch (erro) {
    logger.error({ erro }, 'Falha ao desligar');
    process.exit(1);
  }
}

process.on('SIGTERM', () => void desligar('SIGTERM'));
process.on('SIGINT', () => void desligar('SIGINT'));

// Uma falha não tratada deixa o processo em estado desconhecido: registra e
// sai, para o orquestrador subir uma instância limpa.
process.on('unhandledRejection', (motivo) => {
  logger.fatal({ motivo }, 'Promessa rejeitada sem tratamento');
  process.exit(1);
});

process.on('uncaughtException', (erro) => {
  logger.fatal({ erro }, 'Exceção não capturada');
  process.exit(1);
});
