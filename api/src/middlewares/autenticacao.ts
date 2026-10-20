/**
 * Autenticação por JWT.
 *
 * O token chega no cabeçalho Authorization, no formato "Bearer <token>".
 * Só o identificador do usuário é confiado a partir do token; qualquer outro
 * dado é lido do banco, porque o conteúdo do token é informado pelo cliente.
 */

import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '@/config/env.js';
import { naoAutenticado } from '@/lib/erros.js';

export interface ConteudoToken {
  sub: string;
}

export function assinarToken(usuarioId: string): string {
  return jwt.sign({ sub: usuarioId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRA_EM,
    issuer: 'rotafacil-api',
  } as jwt.SignOptions);
}

export function autenticar(req: Request, _res: Response, next: NextFunction) {
  const cabecalho = req.headers.authorization;

  if (!cabecalho?.startsWith('Bearer ')) {
    return next(naoAutenticado('Envie o token no cabeçalho Authorization'));
  }

  const token = cabecalho.slice('Bearer '.length).trim();

  try {
    const conteudo = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'rotafacil-api',
    }) as ConteudoToken;
    req.usuarioId = conteudo.sub;
    next();
  } catch (erro) {
    if (erro instanceof jwt.TokenExpiredError) {
      return next(naoAutenticado('Sessão expirada, entre novamente'));
    }
    next(naoAutenticado('Token inválido'));
  }
}
