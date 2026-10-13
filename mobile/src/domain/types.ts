/**
 * Modelo de domínio do RotaFácil.
 *
 * Estes tipos são o CONTRATO entre o aplicativo e o servidor. Hoje eles são
 * preenchidos por dados simulados (src/data/mock); quando a API existir, os
 * mesmos tipos passam a ser preenchidos pelas respostas HTTP, sem que
 * nenhuma tela precise mudar.
 *
 * Regra: nada aqui pode importar React, componentes ou bibliotecas de UI.
 */

export type ID = string;
/** Data e hora no formato ISO 8601 (ex.: 2026-10-13T09:30:00-03:00). */
export type DataISO = string;
/** Valor monetário em reais. */
export type Reais = number;

export type CategoriaPOI =
  | 'cultura'
  | 'natureza'
  | 'gastronomia'
  | 'compras'
  | 'vidaNoturna'
  | 'religioso';

/** Modal de deslocamento escolhido pelo algoritmo para um trecho. */
export type Modal = 'pe' | 'app';

/** Bandeira tarifária do táxi aplicada ao trecho (ver seção 3.7 do TCC). */
export type Bandeira = 1 | 2;

export interface Coordenada {
  lat: number;
  lng: number;
}

export interface Cidade {
  id: ID;
  nome: string;
  uf: string;
  pais: string;
  bandeira: string; // emoji da bandeira do país
  centro: Coordenada;
  /** Indica se existe tarifa de táxi calibrada para a cidade. */
  tarifaCalibrada: boolean;
}

export interface PontoInteresse {
  id: ID; // place_id do provedor de mapas
  nome: string;
  categoria: CategoriaPOI;
  endereco: string;
  coordenada: Coordenada;
  nota: number | null;
  avaliacoes: number;
  /** Faixa de preço de 0 a 4, quando informada pelo provedor. */
  faixaPreco: number | null;
  fotoUrl: string | null;
  tempoVisitaMin: number;
  abertoAgora: boolean | null;
  horarioHoje: string | null;
}

/**
 * Custo estimado apresentado como faixa, e não como valor único, porque a
 * tarifação dinâmica dos aplicativos de transporte varia (seção 3.7.4).
 */
export interface FaixaCusto {
  min: Reais;
  estimado: Reais;
  max: Reais;
}

/**
 * Memória de cálculo da tarifa, exibida ao usuário no "como calculamos".
 * Dar transparência ao número é o que diferencia uma estimativa defensável
 * de um valor arbitrário.
 */
export interface DetalheCalculoTarifa {
  bandeirada: Reais;
  valorPorKm: Reais;
  distanciaKm: number;
  minutosLentos: number;
  valorHoraParada: Reais;
  /** Resultado da equação (8): a tarifa de táxi antes da calibração. */
  subtotalTaxi: Reais;
  /** Fator alfa da equação (10), que aproxima o preço do aplicativo. */
  fatorAplicativo: number;
  norma: string;
}

export interface Trecho {
  origemId: ID;
  destinoId: ID;
  modal: Modal;
  distanciaKm: number;
  duracaoMin: number;
  bandeira: Bandeira | null;
  custo: FaixaCusto;
  /** Ausente nos trechos a pé, que não têm custo. */
  calculo: DetalheCalculoTarifa | null;
}

export interface ItemRoteiro {
  ordem: number;
  ponto: PontoInteresse;
  chegadaPrevista: DataISO;
  saidaPrevista: DataISO;
  /** Deslocamento da parada anterior até esta. Ausente no primeiro item. */
  trechoAteAqui: Trecho | null;
  custoNoLocal: Reais;
  visitado: boolean;
}

export interface TotaisRoteiro {
  custoTransporte: FaixaCusto;
  custoLocais: Reais;
  custoTotal: FaixaCusto;
  duracaoMin: number;
  distanciaKm: number;
  /** Percentual do orçamento consumido pela estimativa central. */
  usoOrcamento: number;
  /** Quanto se deixou de gastar nos trechos feitos a pé. */
  economiaCaminhando: Reais;
  trechosAPe: number;
}

export type MotivoDescarte = 'orcamento' | 'tempo' | 'horario';

export interface PontoDescartado {
  ponto: PontoInteresse;
  motivo: MotivoDescarte;
  /** Texto pronto para a interface, ex.: "faltariam R$ 12,40". */
  detalhe: string;
}

/**
 * Números do processamento, usados na apresentação e como métrica técnica
 * no capítulo de resultados.
 */
export interface DiagnosticoRoteiro {
  candidatosAvaliados: number;
  trechosCalculados: number;
  duracaoMs: number;
}

/** Entrada do usuário para a geração de um roteiro. */
export interface PreferenciasRoteiro {
  cidadeId: ID;
  origem: Coordenada;
  categorias: CategoriaPOI[];
  orcamento: Reais;
  tempoDisponivelMin: number;
  inicioPrevisto: DataISO;
}

export interface Roteiro {
  id: ID;
  cidadeId: ID;
  cidadeNome: string;
  criadoEm: DataISO;
  inicioPrevisto: DataISO;
  orcamento: Reais;
  tempoDisponivelMin: number;
  itens: ItemRoteiro[];
  totais: TotaisRoteiro;
  /** Pontos avaliados pelo algoritmo e descartados, com o motivo. */
  descartados: PontoDescartado[];
  diagnostico: DiagnosticoRoteiro;
  /** Entradas que originaram este roteiro, para permitir o recálculo. */
  preferencias: PreferenciasRoteiro;
}

/** Versão resumida usada nas listagens de histórico. */
export interface ResumoRoteiro {
  id: ID;
  cidadeNome: string;
  criadoEm: DataISO;
  totalPontos: number;
  custoEstimado: Reais;
  capaUrl: string | null;
}

export interface Visita {
  id: ID;
  roteiroId: ID;
  pontoId: ID;
  chegadaEm: DataISO;
  custoRegistrado: Reais | null;
}

export interface Usuario {
  id: ID;
  nome: string;
  email: string;
  avatarUrl: string | null;
}
