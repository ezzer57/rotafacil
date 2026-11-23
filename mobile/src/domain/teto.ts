/**
 * Leitura do teto de gasto digitado na tela Nova rota.
 *
 * Campo vazio é "sem limite". Zero não é: antes ele virava "sem limite" sem
 * avisar, o contrário do que a pessoa pediu. Um valor baixo é aceito, mas a
 * tela avisa que quase nada cabe nele.
 */

import { TETO_MINIMO } from './limites';

export interface TetoLido {
  /** Teto em reais; null sem limite (ou enquanto o valor é inválido). */
  valor: number | null;
  /** Impede gerar o roteiro. */
  erro: string | null;
  /** Só informa; o roteiro pode ser gerado. */
  aviso: string | null;
}

export function lerTeto(texto: string): TetoLido {
  const limpo = texto.trim();
  if (limpo === '') return { valor: null, erro: null, aviso: null };

  const valor = Number(limpo.replace(',', '.'));
  if (!Number.isFinite(valor) || valor <= 0) {
    return {
      valor: null,
      erro: 'Use um valor maior que zero, ou escolha "Sem limite".',
      aviso: null,
    };
  }

  return {
    valor,
    erro: null,
    aviso:
      valor < TETO_MINIMO
        ? `Com menos de R$ ${TETO_MINIMO}, quase só cabem caminhadas e lugares gratuitos.`
        : null,
  };
}
