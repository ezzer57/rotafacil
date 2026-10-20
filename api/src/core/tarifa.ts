/**
 * Estimativa de custo de deslocamento (seção 3.7 do TCC).
 *
 * O modelo parte da metodologia tarifária do táxi, que é pública e fixada
 * por norma municipal, e aplica um fator de calibração obtido empiricamente
 * para aproximar o preço praticado pelos aplicativos de transporte, cujas
 * tabelas não são publicadas.
 *
 * Todo o cálculo mora aqui, em funções puras, para poder ser testado valor a
 * valor e auditado por quem avaliar o trabalho.
 */

export type Bandeira = 1 | 2;

export interface ParametrosTarifa {
  bandeirada: number;
  kmBandeira1: number;
  kmBandeira2: number;
  /** Valor da hora parada, cobrada em trânsito lento. */
  horaParada: number;
  /** Fator médio de conversão para o preço de aplicativo. */
  alfa: number;
  /** Percentis 10 e 90 das razões observadas, que formam a faixa exibida. */
  alfaP10: number;
  alfaP90: number;
  norma: string;
}

export interface FaixaCusto {
  min: number;
  estimado: number;
  max: number;
}

export interface MemoriaDeCalculo {
  bandeirada: number;
  valorPorKm: number;
  distanciaKm: number;
  minutosLentos: number;
  valorHoraParada: number;
  subtotalTaxi: number;
  fatorAplicativo: number;
  norma: string;
}

/** Arredonda para duas casas, evitando o arrasto do ponto flutuante. */
export const emReais = (valor: number): number => Math.round(valor * 100) / 100;

/**
 * Bandeira 2 das 22h às 6h e aos domingos. Os horários variam por município;
 * quando as normas forem levantadas, isto passa a ser parâmetro da cidade.
 */
export function bandeiraDe(momento: Date): Bandeira {
  const hora = momento.getHours();
  const domingo = momento.getDay() === 0;
  return hora >= 22 || hora < 6 || domingo ? 2 : 1;
}

/**
 * Equação (8): tarifa do táxi para um trecho.
 *
 *   C = bandeirada + (R$/km × distância) + (R$/hora parada ÷ 60 × minutos lentos)
 */
export function custoTaxi(
  distanciaKm: number,
  minutosLentos: number,
  bandeira: Bandeira,
  tarifa: ParametrosTarifa,
): number {
  if (distanciaKm < 0 || minutosLentos < 0) {
    throw new Error('Distância e tempo não podem ser negativos');
  }
  const valorKm = bandeira === 1 ? tarifa.kmBandeira1 : tarifa.kmBandeira2;
  return emReais(
    tarifa.bandeirada + valorKm * distanciaKm + (tarifa.horaParada / 60) * minutosLentos,
  );
}

/**
 * Equação (10): converte a tarifa de táxi na faixa de preço do aplicativo.
 * O resultado é uma faixa, e não um número único, porque a tarifação
 * dinâmica das plataformas varia ao longo do dia.
 */
export function faixaAplicativo(custoBase: number, tarifa: ParametrosTarifa): FaixaCusto {
  return {
    min: emReais(custoBase * tarifa.alfaP10),
    estimado: emReais(custoBase * tarifa.alfa),
    max: emReais(custoBase * tarifa.alfaP90),
  };
}

/** Estimativa completa de um trecho feito por aplicativo. */
export function estimarTrechoPorAplicativo(
  distanciaKm: number,
  minutosLentos: number,
  momentoDaPartida: Date,
  tarifa: ParametrosTarifa,
): { bandeira: Bandeira; custo: FaixaCusto; calculo: MemoriaDeCalculo } {
  const bandeira = bandeiraDe(momentoDaPartida);
  const subtotalTaxi = custoTaxi(distanciaKm, minutosLentos, bandeira, tarifa);

  return {
    bandeira,
    custo: faixaAplicativo(subtotalTaxi, tarifa),
    calculo: {
      bandeirada: tarifa.bandeirada,
      valorPorKm: bandeira === 1 ? tarifa.kmBandeira1 : tarifa.kmBandeira2,
      distanciaKm,
      minutosLentos,
      valorHoraParada: tarifa.horaParada,
      subtotalTaxi,
      fatorAplicativo: tarifa.alfa,
      norma: tarifa.norma,
    },
  };
}

/**
 * Erro percentual absoluto médio entre preços observados e estimados.
 * É a métrica usada para avaliar a hipótese de previsibilidade orçamentária.
 */
export function mape(pares: { observado: number; estimado: number }[]): number {
  if (pares.length === 0) throw new Error('É preciso ao menos uma observação');
  const soma = pares.reduce((acumulado, { observado, estimado }) => {
    if (observado === 0) throw new Error('Preço observado não pode ser zero');
    return acumulado + Math.abs(observado - estimado) / observado;
  }, 0);
  return (100 * soma) / pares.length;
}
