/**
 * Validação de entrada com Zod.
 *
 * Esta é a validação que vale: a do aplicativo é conveniência e pode ser
 * burlada. Além de validar, o middleware substitui req.body pelo dado já
 * convertido (datas viram Date, números viram number), então o restante do
 * código trabalha com tipos confiáveis.
 */

import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

interface Esquemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export function validar(esquemas: Esquemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (esquemas.body) req.body = esquemas.body.parse(req.body);
      // Em Express 5 req.params tem tipo amplo (string | string[]); o
      // resultado tipado da validacao fica em req.parametros.
      if (esquemas.params) {
        req.parametros = esquemas.params.parse(req.params) as Record<string, string>;
      }
      if (esquemas.query) {
        // Em Express 5 req.query é somente leitura; o resultado fica em req.consulta.
        req.consulta = esquemas.query.parse(req.query) as Record<string, unknown>;
      }
      next();
    } catch (erro) {
      next(erro);
    }
  };
}

/**
 * Parâmetro de rota já validado por `validar({ params })`. Faltar aqui é erro
 * de programação (a rota esqueceu de validar), não do usuário.
 */
export function parametro(req: Request, nome: string): string {
  const valor = req.parametros?.[nome];
  if (valor === undefined) throw new Error(`Parâmetro "${nome}" não foi validado nesta rota`);
  return valor;
}

/** Query string já validada, no tipo do esquema usado em `validar({ query })`. */
export function consulta<T>(req: Request): T {
  return req.consulta as T;
}
