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
      if (esquemas.params) req.parametros = esquemas.params.parse(req.params);
      if (esquemas.query) {
        // Em Express 5 req.query é somente leitura; o resultado fica em req.consulta.
        req.consulta = esquemas.query.parse(req.query);
      }
      next();
    } catch (erro) {
      next(erro);
    }
  };
}
