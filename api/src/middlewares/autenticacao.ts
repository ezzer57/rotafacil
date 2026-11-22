/**
 * Autenticação por JWT.
 *
 * O token chega no cabeçalho Authorization, no formato "Bearer <token>".
 * Só o identificador do usuário é confiado a partir do token; qualquer outro
 * dado é lido do banco, porque o conteúdo do token é informado pelo cliente.
 *
 * O token não basta sozinho: a conta precisa existir. Sem essa conferência,
 * quem apagou a conta (LGPD, art. 18) continuaria com um token válido até
 * ele expirar.
 */

import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '@/config/env.js';
import { naoAutenticado } from '@/lib/erros.js';
import { prisma } from '@/lib/prisma.js';

const EMISSOR = 'rotafacil-api';
/** Um algoritmo só: o token não escolhe como será conferido. */
const ALGORITMO = 'HS256';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assinarToken(usuarioId: string): string {
  return jwt.sign({ sub: usuarioId }, env.JWT_SECRET, {
    algorithm: ALGORITMO,
    expiresIn: env.JWT_EXPIRA_EM,
    issuer: EMISSOR,
  } as jwt.SignOptions);
}

/** Identificador do usuário no token, ou o motivo de o token não valer. */
function lerToken(token: string): { usuarioId: string } | { erro: string } {
  try {
    const conteudo = jwt.verify(token, env.JWT_SECRET, {
      issuer: EMISSOR,
      algorithms: [ALGORITMO],
    });
    if (
      typeof conteudo !== 'object' ||
      typeof conteudo.sub !== 'string' ||
      !UUID.test(conteudo.sub)
    ) {
      return { erro: 'Token inválido' };
    }
    return { usuarioId: conteudo.sub };
  } catch (erro) {
    if (erro instanceof jwt.TokenExpiredError) return { erro: 'Sessão expirada, entre novamente' };
    return { erro: 'Token inválido' };
  }
}

export async function autenticar(req: Request, _res: Response, next: NextFunction) {
  const cabecalho = req.headers.authorization;
  if (!cabecalho?.startsWith('Bearer ')) {
    return next(naoAutenticado('Envie o token no cabeçalho Authorization'));
  }

  const lido = lerToken(cabecalho.slice('Bearer '.length).trim());
  if ('erro' in lido) return next(naoAutenticado(lido.erro));

  const conta = await prisma.usuario.findUnique({
    where: { id: lido.usuarioId },
    select: { id: true },
  });
  if (!conta) return next(naoAutenticado('Esta conta não existe mais. Entre novamente.'));

  req.usuarioId = lido.usuarioId;
  next();
}
