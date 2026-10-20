import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '@/lib/prisma.js';
import { validar } from '@/middlewares/validacao.js';
import { serializarCidade } from '@/modules/roteiros/serializador.js';

export const rotasCidades = Router();

const buscaSchema = z.object({ q: z.string().trim().max(120).optional() });

/**
 * Lista pública: o aplicativo precisa dela antes do login, na tela inicial.
 * Só traz cidades ativas, e informa quais já têm tarifa calibrada.
 */
rotasCidades.get('/', validar({ query: buscaSchema }), async (req, res) => {
  const termo = req.consulta?.q as string | undefined;
  const agora = new Date();

  const cidades = await prisma.cidade.findMany({
    where: {
      ativa: true,
      ...(termo ? { nome: { contains: termo, mode: 'insensitive' } } : {}),
    },
    include: {
      tarifas: {
        where: {
          vigenciaInicio: { lte: agora },
          OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: agora } }],
        },
        select: { id: true },
      },
    },
    orderBy: { nome: 'asc' },
  });

  res.json(cidades.map(serializarCidade));
});
