import 'express';

declare global {
  namespace Express {
    interface Request {
      /** Preenchido pelo middleware de autenticação. */
      usuarioId?: string;
      /** Query string já validada e convertida pelo middleware de validação. */
      consulta?: any;
      /** Parâmetros de rota já validados pelo middleware de validação. */
      parametros?: any;
    }
  }
}

export {};
