import { Router } from 'express';

import {
  ajustarRoteiroSchema,
  gerarRoteiroSchema,
  idParamSchema,
  paginacaoSchema,
  visitaSchema,
} from '@/contratos/index.js';
import { autenticar } from '@/middlewares/autenticacao.js';
import { validar } from '@/middlewares/validacao.js';
import * as servico from './roteiros.service.js';

export const rotasRoteiros = Router();

// Todas as rotas de roteiro exigem usuário autenticado.
rotasRoteiros.use(autenticar);

rotasRoteiros.post('/', validar({ body: gerarRoteiroSchema }), async (req, res) => {
  const roteiro = await servico.gerar(req.usuarioId!, req.body);
  res.status(201).json(roteiro);
});

rotasRoteiros.get('/', validar({ query: paginacaoSchema }), async (req, res) => {
  const { limite, pagina } = req.consulta;
  res.json(await servico.listar(req.usuarioId!, limite, pagina));
});

rotasRoteiros.get('/:id', validar({ params: idParamSchema }), async (req, res) => {
  res.json(await servico.obter(req.usuarioId!, req.parametros.id));
});

rotasRoteiros.patch(
  '/:id',
  validar({ params: idParamSchema, body: ajustarRoteiroSchema }),
  async (req, res) => {
    const corpo = req.body;
    const operacao =
      corpo.operacao === 'orcamento'
        ? ({ tipo: 'orcamento', valor: corpo.orcamento } as const)
        : ({ tipo: corpo.operacao, pontoId: corpo.pontoId } as const);

    res.json(await servico.ajustar(req.usuarioId!, req.parametros.id, operacao));
  },
);

rotasRoteiros.post(
  '/:id/checkins',
  validar({ params: idParamSchema, body: visitaSchema }),
  async (req, res) => {
    const visita = await servico.registrarVisita(
      req.usuarioId!,
      req.parametros.id,
      req.body.pontoId,
      req.body.custoRegistrado,
    );
    res.status(201).json(visita);
  },
);

rotasRoteiros.delete('/:id', validar({ params: idParamSchema }), async (req, res) => {
  await servico.excluir(req.usuarioId!, req.parametros.id);
  res.status(204).send();
});
