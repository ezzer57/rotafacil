import 'express';

declare global {
  namespace Express {
    interface Request {
      /** Preenchido pelo middleware de autenticação. */
      usuarioId?: string;
      /**
       * Query string já validada e convertida pelo middleware de validação. A
       * rota converte para o tipo do esquema que usou na validação.
       */
      consulta?: Record<string, unknown>;
      /** Parâmetros de rota já validados (sempre texto, como vêm da URL). */
      parametros?: Record<string, string>;
    }
  }
}

export {};
