import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '@/lib/prisma.js';
import { naoEncontrado } from '@/lib/erros.js';
import { validar } from '@/middlewares/validacao.js';
import { serializarPonto } from '@/modules/roteiros/serializador.js';

export const rotasPontos = Router();

const paramSchema = z.object({ id: z.string().min(1).max(120) });

rotasPontos.get('/:id', validar({ params: paramSchema }), async (req, res) => {
  const ponto = await prisma.pontoInteresse.findUnique({ where: { id: req.parametros.id } });
  if (!ponto) throw naoEncontrado('Ponto de interesse');
  res.json(serializarPonto(ponto));
});
