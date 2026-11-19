/**
 * Limites dos valores em reais que o usuário digita.
 *
 * Os mesmos números valem na API (src/contratos), para o app e o servidor
 * concordarem. Foram medidos com os pontos cadastrados:
 *  - o roteiro mais caro de 8 horas, sem teto e com todos os lugares pagos,
 *    custa no máximo cerca de R$ 220 (Fortaleza); com todos os lugares pagos
 *    de uma cidade e corridas entre eles, a conta não passa de R$ 300. Um teto
 *    acima disso é o mesmo que "sem limite";
 *  - a corrida mais cara entre dois pontos de uma mesma cidade sai por cerca
 *    de R$ 90 (Dragão do Mar até o Centro das Tapioqueiras, bandeira 2). O
 *    limite do valor pago deixa folga para a tarifa dinâmica dos aplicativos.
 */

/** Teto de gasto do dia, em reais. */
export const TETO_MAXIMO = 300;
export const TETO_MINIMO = 20;

/** Valor pago numa corrida, informado no check-in. */
export const CORRIDA_MAXIMA = 150;

/**
 * Deixa só um valor em reais válido enquanto a pessoa digita: números, uma
 * vírgula e até dois centavos. Acima do máximo, fica no máximo.
 */
export function limitarValorEmReais(texto: string, maximo: number): string {
  const limpo = texto.replace(/\./g, ',').replace(/[^\d,]/g, '');
  const [inteiro = '', ...resto] = limpo.split(',');
  const semZerosAEsquerda = inteiro.replace(/^0+(?=\d)/, '');
  const valorDigitado =
    resto.length > 0 ? `${semZerosAEsquerda || '0'},${resto.join('').slice(0, 2)}` : semZerosAEsquerda;

  return Number(valorDigitado.replace(',', '.')) > maximo ? String(maximo) : valorDigitado;
}
