import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { cadastroSchema, consentimentoSchema, loginSchema } from '@/contratos/index.js';
import { assinarToken, autenticar } from '@/middlewares/autenticacao.js';
import { validar } from '@/middlewares/validacao.js';
import * as servico from './auth.service.js';

/**
 * Limite estrito nas rotas de credencial: segura tentativa de adivinhar
 * senha por força bruta sem atrapalhar o uso normal do aplicativo.
 */
const limiteCredencial = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    erro: {
      codigo: 'EXCESSO_REQUISICOES',
      mensagem: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    },
  },
});

export const rotasAuth = Router();

rotasAuth.post(
  '/users',
  limiteCredencial,
  validar({ body: cadastroSchema }),
  async (req, res) => {
    const usuario = await servico.cadastrar(req.body);
    res.status(201).json({ usuario, token: assinarToken(usuario.id) });
  },
);

rotasAuth.post(
  '/sessions',
  limiteCredencial,
  validar({ body: loginSchema }),
  async (req, res) => {
    const usuario = await servico.autenticarCredencial(req.body);
    res.json({ usuario, token: assinarToken(usuario.id) });
  },
);

rotasAuth.get('/me', autenticar, async (req, res) => {
  res.json(await servico.buscarPorId(req.usuarioId!));
});

rotasAuth.post(
  '/consents',
  autenticar,
  validar({ body: consentimentoSchema }),
  async (req, res) => {
    const registro = await servico.registrarConsentimento(
      req.usuarioId!,
      req.body.tipo,
      req.body.versao,
    );
    res.status(201).json(registro);
  },
);

rotasAuth.delete('/me', autenticar, async (req, res) => {
  await servico.excluirConta(req.usuarioId!);
  res.status(204).send();
});
