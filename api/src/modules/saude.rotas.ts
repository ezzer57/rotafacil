/**
 * Verificações de saúde.
 *
 * Separadas de propósito: `live` responde se o processo está de pé e serve
 * para o orquestrador decidir reiniciar; `ready` confere a dependência
 * externa (banco) e serve para decidir se o servidor pode receber tráfego.
 * Um banco fora do ar não deve provocar reinício em laço do processo.
 */

import { Router } from 'express';

import { prisma } from '@/lib/prisma.js';

export const rotasSaude = Router();

rotasSaude.get('/live', (_req, res) => {
  res.json({ status: 'ok', emSegundos: Math.round(process.uptime()) });
});

rotasSaude.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', banco: 'conectado' });
  } catch {
    res.status(503).json({
      erro: { codigo: 'INTERNO', mensagem: 'Banco de dados indisponível' },
    });
  }
});
