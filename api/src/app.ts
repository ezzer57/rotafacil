/**
 * Montagem da aplicação Express.
 *
 * Fica separada do servidor (src/server.ts) para que os testes possam criar
 * a aplicação sem abrir porta nenhuma.
 *
 * A ordem dos middlewares importa: segurança e limites antes das rotas, e o
 * tratador de erros sempre por último.
 */

import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'node:crypto';

import { env } from '@/config/env.js';
import { logger } from '@/lib/logger.js';
import { rotaNaoEncontrada, tratadorDeErros } from '@/middlewares/erro.js';
import { rotasAuth } from '@/modules/auth/auth.rotas.js';
import { rotasCidades } from '@/modules/cidades/cidades.rotas.js';
import { rotasPontos } from '@/modules/pontos/pontos.rotas.js';
import { rotasRoteiros } from '@/modules/roteiros/roteiros.rotas.js';
import { rotasSaude } from '@/modules/saude.rotas.js';

export function criarApp() {
  const app = express();

  // Atrás do proxy do Render, o IP real vem em X-Forwarded-For. Sem isto, o
  // limite por IP enxergaria todos os clientes como um só.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());

  app.use(
    cors({
      origin(origem, retorno) {
        // Requisições sem origem (aplicativo nativo, curl) são permitidas;
        // navegadores sempre enviam Origin e passam pela lista.
        if (!origem || env.CORS_ORIGENS.length === 0) return retorno(null, true);
        if (env.CORS_ORIGENS.includes(origem)) return retorno(null, true);
        return retorno(new Error('Origem não autorizada pelo CORS'));
      },
      credentials: true,
    }),
  );

  app.use(compression());

  // Limite de tamanho do corpo: evita que um JSON gigante consuma memória.
  app.use(express.json({ limit: '100kb' }));

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = (req.headers['x-request-id'] as string) ?? randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      // Saúde responde a cada poucos segundos; logar tudo isso só faz ruído.
      autoLogging: { ignore: (req) => req.url?.startsWith('/health') ?? false },
    }),
  );

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      skip: (req) => req.path.startsWith('/health'),
      message: {
        erro: {
          codigo: 'EXCESSO_REQUISICOES',
          mensagem: 'Muitas requisições. Tente novamente em alguns minutos.',
        },
      },
    }),
  );

  app.use('/health', rotasSaude);

  app.get('/', (_req, res) => {
    res.json({ nome: 'RotaFácil API', versao: 'v1', documentacao: '/v1' });
  });

  app.use('/v1', rotasAuth);
  app.use('/v1/cities', rotasCidades);
  app.use('/v1/places', rotasPontos);
  app.use('/v1/itineraries', rotasRoteiros);

  app.use(rotaNaoEncontrada);
  app.use(tratadorDeErros);

  return app;
}
