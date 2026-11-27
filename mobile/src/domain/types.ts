/**
 * Modelo de domínio do RotaFácil.
 *
 * Estes tipos são o CONTRATO entre o aplicativo e a API: as respostas HTTP e
 * o modo de demonstração (src/data/mock) preenchem os mesmos tipos, e
 * nenhuma tela sabe de onde o dado veio.
 *
 * A API confere este contrato na compilação
 * (api/src/modules/roteiros/formato-do-app.ts): se ela mudar um campo e este
 * arquivo não, a checagem de tipos dela falha.
 *
 * Regra: este arquivo não importa nada, nem React nem bibliotecas, para a API
 * conseguir lê-lo.
 */

export type ID = string;
/** Data e hora no formato ISO 8601 (ex.: 2026-10-13T09:30:00-03:00). */
export type DataISO = string;
/** Valor monetário em reais. */
export type Reais = number;

export type CategoriaPOI =
  'cultura' | 'natureza' | 'gastronomia' | 'compras' | 'vidaNoturna' | 'religioso';

/** Modal de deslocamento escolhido pelo algoritmo para um trecho. */
export type Modal = 'pe' | 'app';

/** Bandeira tarifária do táxi aplicada ao trecho (ver seção 4.3 do TCC). */
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
  /** Autor e licença da foto, para exibir junto dela. */
  fotoCredito: string | null;
  /** Página da foto no Wikimedia Commons. */
  fotoFonte: string | null;
  tempoVisitaMin: number;
  /** Quanto o lugar é imperdível, de 1 a 5, com o mesmo critério em toda cidade. */
  relevancia: number;
  /** Parque, praça, praia, mirante ou trilha: nunca fica fora do horário. */
  arLivre: boolean;
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
  /** Resultado da equação (3): a tarifa de táxi antes da calibração. */
  subtotalTaxi: Reais;
  /** Fator alfa da equação (4), que aproxima o preço do aplicativo. */
  fatorAplicativo: number;
  norma: string;
}

/** Origem da distância: medida pelas ruas ou estimada em linha reta x 1,3. */
export type FonteDaMedida = 'ruas' | 'estimada';

export interface Trecho {
  /** A parada anterior, "origem" (a partida do roteiro) ou "posicao" (ver `partida`). */
  origemId: ID;
  /**
   * De onde o trecho saiu quando não foi da parada anterior: no "Recalcular
   * daqui", a posição da pessoa naquela hora. Null no caso comum.
   */
  partida: Coordenada | null;
  destinoId: ID;
  modal: Modal;
  fonte: FonteDaMedida;
  /** Ruas do trecho, como [lat, lng]; null quando não foi possível traçar. */
  trajeto: [number, number][] | null;
  distanciaKm: number;
  duracaoMin: number;
  bandeira: Bandeira | null;
  custo: FaixaCusto;
  /** Ausente nos trechos a pé, que não têm custo. */
  calculo: DetalheCalculoTarifa | null;
}

/** Registro do check-in: quando o usuário chegou e quanto pagou na corrida. */
export interface VisitaRegistrada {
  chegadaEm: DataISO;
  custoRegistrado: Reais | null;
}

/** Como o lugar estará na hora prevista da visita. */
export type SituacaoNoHorario = 'aberto' | 'fechado' | 'fecha-durante-a-visita';

export interface ItemRoteiro {
  ordem: number;
  ponto: PontoInteresse;
  chegadaPrevista: DataISO;
  saidaPrevista: DataISO;
  /** Deslocamento da parada anterior até esta. Ausente no primeiro item. */
  trechoAteAqui: Trecho | null;
  custoNoLocal: Reais;
  /**
   * Lugar fechado na hora prevista não sai do roteiro: entra marcado, para o
   * usuário decidir se vai mesmo assim.
   */
  situacaoNoHorario: SituacaoNoHorario;
  visitado: boolean;
  /** Check-in feito na parada; null enquanto o usuário não chegou. */
  visita: VisitaRegistrada | null;
}

export interface TotaisRoteiro {
  custoTransporte: FaixaCusto;
  custoLocais: Reais;
  custoTotal: FaixaCusto;
  duracaoMin: number;
  distanciaKm: number;
  /** Percentual do orçamento consumido pela estimativa central; null sem teto. */
  usoOrcamento: number | null;
  /** Quanto se deixou de gastar nos trechos feitos a pé. */
  economiaCaminhando: Reais;
  trechosAPe: number;
  /** Paradas com check-in feito. */
  pontosVisitados: number;
  /** Soma do que o usuário pagou nas corridas; null se não informou nenhum valor. */
  custoRegistrado: Reais | null;
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
  /** Quantos trechos foram medidos pelas ruas: todos, alguns ou nenhum. */
  rotas: 'ruas' | 'parcial' | 'estimada';
  candidatosAvaliados: number;
  trechosCalculados: number;
  duracaoMs: number;
}

/** Entrada do usuário para a geração de um roteiro. */
export interface PreferenciasRoteiro {
  cidadeId: ID;
  origem: Coordenada;
  categorias: CategoriaPOI[];
  /** Teto de gasto do dia; null quando o usuário não define limite. */
  orcamento: Reais | null;
  tempoDisponivelMin: number;
  inicioPrevisto: DataISO;
}

/** De onde o "Recalcular daqui" partiu: da posição, da última parada feita ou da partida. */
export type OrigemDoRecalculo = 'posicao' | 'ultima-parada' | 'partida';

/**
 * O último "Recalcular daqui": o resto do roteiro foi refeito a partir de
 * `origem`, na hora `em`, com `tempoDisponivelMin` livres. As paradas em que
 * a pessoa já tinha chegado ficaram como estavam.
 */
export interface RecalculoRoteiro {
  em: DataISO;
  origem: Coordenada;
  tempoDisponivelMin: number;
  de: OrigemDoRecalculo;
}

export interface Roteiro {
  id: ID;
  cidadeId: ID;
  cidadeNome: string;
  criadoEm: DataISO;
  inicioPrevisto: DataISO;
  /** Teto de gasto; null quando não há limite. */
  orcamento: Reais | null;
  tempoDisponivelMin: number;
  itens: ItemRoteiro[];
  totais: TotaisRoteiro;
  /** Pontos avaliados pelo algoritmo e descartados, com o motivo. */
  descartados: PontoDescartado[];
  diagnostico: DiagnosticoRoteiro;
  /** Entradas que originaram este roteiro, para permitir o recálculo. */
  preferencias: PreferenciasRoteiro;
  /** Null enquanto o roteiro não foi recalculado "daqui". */
  recalculo: RecalculoRoteiro | null;
}

/** O pedido do "Recalcular daqui". */
export interface PedidoDeRecalculo {
  /** Posição do aparelho; null quando o GPS foi negado ou não respondeu. */
  origem: Coordenada | null;
  /** Quanto tempo a pessoa ainda tem, a partir de agora. */
  tempoDisponivelMin: number;
}

/** Versão resumida usada nas listagens de histórico. */
export interface ResumoRoteiro {
  id: ID;
  cidadeNome: string;
  criadoEm: DataISO;
  totalPontos: number;
  custoEstimado: Reais;
  capaUrl: string | null;
  pontosVisitados: number;
  custoRegistrado: Reais | null;
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
}
