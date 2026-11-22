/**
 * Conferência, na compilação, de que a API responde no formato que o
 * aplicativo espera (mobile/src/domain/types.ts).
 *
 * O app e a API são escritos separadamente, e um campo renomeado de um lado só
 * passaria despercebido até alguém abrir a tela. Aqui cada resposta precisa
 * caber no tipo do app: se não couber, `npm run typecheck` falha e aponta o
 * campo.
 *
 * Só tipos: nada deste arquivo roda, e ninguém o importa.
 */

import type * as App from '../../../../mobile/src/domain/types';
import type { autenticarCredencial, cadastrar } from '../auth/auth.service.js';
import type {
  serializarCidade,
  serializarPonto,
  serializarResumo,
  serializarRoteiro,
} from './serializador.js';
import type { listar, registrarVisita } from './roteiros.service.js';

/** Só compila se `Api` couber em `Esperado`. */
type Confere<Api extends Esperado, Esperado> = Api;

export type FormatoDoApp = [
  Confere<ReturnType<typeof serializarRoteiro>, App.Roteiro>,
  Confere<ReturnType<typeof serializarResumo>, App.ResumoRoteiro>,
  Confere<Awaited<ReturnType<typeof listar>>['itens'][number], App.ResumoRoteiro>,
  Confere<ReturnType<typeof serializarPonto>, App.PontoInteresse>,
  Confere<ReturnType<typeof serializarCidade>, App.Cidade>,
  Confere<Awaited<ReturnType<typeof registrarVisita>>, App.Visita>,
  Confere<Awaited<ReturnType<typeof cadastrar>>, App.Usuario>,
  Confere<Awaited<ReturnType<typeof autenticarCredencial>>, App.Usuario>,
];
