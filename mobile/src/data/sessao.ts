/**
 * Sessão do usuário no aparelho.
 *
 * O token fica guardado em área protegida do sistema (SecureStore) e também
 * em memória, porque o cliente HTTP precisa lê-lo de forma síncrona a cada
 * requisição, e leitura em disco é assíncrona.
 *
 * A cópia em memória é sempre um espelho do que está gravado: toda escrita
 * passa por aqui.
 */

import { lerToken, limparToken, salvarToken } from './token';

let tokenEmMemoria: string | null = null;
let hidratado = false;

/** Lê o token gravado no aparelho. Chamado uma vez, na abertura do app. */
export async function hidratarSessao(): Promise<string | null> {
  if (hidratado) return tokenEmMemoria;
  try {
    tokenEmMemoria = await lerToken();
  } catch {
    // Aparelho sem armazenamento seguro disponível: segue deslogado.
    tokenEmMemoria = null;
  }
  hidratado = true;
  return tokenEmMemoria;
}

export async function definirToken(token: string): Promise<void> {
  tokenEmMemoria = token;
  hidratado = true;
  await salvarToken(token);
}

export async function encerrarSessao(): Promise<void> {
  tokenEmMemoria = null;
  await limparToken();
}

/** Leitura síncrona, usada pelo cliente HTTP a cada requisição. */
export const tokenAtual = (): string | null => tokenEmMemoria;
