/**
 * Tratamento central de erros.
 *
 * Toda resposta de erro tem o mesmo formato, com um código estável que o
 * aplicativo pode usar para decidir o que fazer:
 *
 *   { "erro": { "codigo": "NAO_ENCONTRADO", "mensagem": "...", "detalhes": ... } }
 *
 * Erro inesperado nunca expõe mensagem interna nem pilha para o cliente:
 * isso vira log no servidor e um 500 genérico na resposta.
 */

import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

import { ErroApp } from '@/lib/erros.js';
import { emProducao } from '@/config/env.js';

export function rotaNaoEncontrada(req: Request, res: Response) {
  res.status(404).json({
    erro: {
      codigo: 'NAO_ENCONTRADO',
      mensagem: `Rota ${req.method} ${req.path} não existe`,
    },
  });
}

export function tratadorDeErros(
  erro: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (erro instanceof ErroApp) {
    res.status(erro.status).json({
      erro: { codigo: erro.codigo, mensagem: erro.message, detalhes: erro.detalhes },
    });
    return;
  }

  if (erro instanceof ZodError) {
    res.status(422).json({
      erro: {
        codigo: 'VALIDACAO',
        mensagem: 'Dados inválidos',
        detalhes: erro.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
      },
    });
    return;
  }

  // Violação de unicidade: e-mail já cadastrado, por exemplo.
  if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
    res.status(409).json({
      erro: { codigo: 'CONFLITO', mensagem: 'Registro já existe' },
    });
    return;
  }

  // Erros do express.json e do CORS chegam como Error comum, mas carregam
  // status e tipo. Sem este tratamento, um corpo grande demais viraria 500.
  const comStatus = erro as { status?: number; statusCode?: number; type?: string; message?: string };
  const status = comStatus.status ?? comStatus.statusCode;

  if (comStatus.type === 'entity.too.large') {
    res.status(413).json({
      erro: { codigo: 'CORPO_GRANDE_DEMAIS', mensagem: 'O corpo da requisição excede o limite' },
    });
    return;
  }

  if (comStatus.type === 'entity.parse.failed') {
    res.status(400).json({
      erro: { codigo: 'JSON_INVALIDO', mensagem: 'O corpo da requisição não é um JSON válido' },
    });
    return;
  }

  if (comStatus.message?.includes('CORS')) {
    res.status(403).json({
      erro: { codigo: 'SEM_PERMISSAO', mensagem: 'Origem não autorizada' },
    });
    return;
  }

  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).json({
      erro: { codigo: 'VALIDACAO', mensagem: comStatus.message ?? 'Requisição inválida' },
    });
    return;
  }

  req.log?.error({ erro }, 'Erro não tratado');

  res.status(500).json({
    erro: {
      codigo: 'INTERNO',
      mensagem: 'Erro interno no servidor',
      // Em desenvolvimento a mensagem real ajuda; em produção, nunca.
      detalhes: emProducao ? undefined : erro instanceof Error ? erro.message : String(erro),
    },
  });
}
