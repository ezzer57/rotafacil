/**
 * Log estruturado em JSON.
 *
 * Campos sensíveis são removidos antes de sair: senha e token nunca podem
 * aparecer em log, nem em desenvolvimento, porque log vaza em print de tela,
 * em arquivo e em serviço de observabilidade.
 */

import pino from 'pino';

import { emProducao, emTeste, env } from '@/config/env.js';

export const logger = pino({
  level: emTeste ? 'silent' : env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.senha',
      'req.body.confirmacao',
      '*.senhaHash',
      'token',
    ],
    censor: '[removido]',
  },
  // Em desenvolvimento, log legível; em produção, JSON puro para a máquina.
  transport: emProducao || emTeste ? undefined : { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
});
