/**
 * Serviços do aplicativo: o que as telas podem pedir.
 *
 * As telas nunca chamam fetch nem conhecem URL. Elas consomem estas
 * interfaces através dos hooks em src/hooks. Há duas implementações: a da
 * API (src/data/http) e a do modo de demonstração (src/data/mock); quem
 * escolhe é src/data/provider.tsx, pela variável EXPO_PUBLIC_API_URL.
 *
 * Cada operação corresponde a um endpoint da API:
 *   POST   /v1/itineraries              -> RoteiroService.gerar
 *   GET    /v1/itineraries/:id          -> RoteiroService.obter
 *   GET    /v1/itineraries              -> RoteiroService.listar
 *   PATCH  /v1/itineraries/:id          -> RoteiroService.removerPonto / substituirPonto
 *   POST   /v1/itineraries/:id/recalculate -> RoteiroService.recalcularDaqui
 *   POST   /v1/itineraries/:id/checkins -> RoteiroService.registrarVisita
 *   DELETE /v1/itineraries/:id/checkins/:pontoId -> RoteiroService.desfazerVisita
 *   GET    /v1/cities                   -> CidadeService.listar
 *   POST   /v1/sessions                 -> AuthService.entrar
 *   DELETE /v1/me                       -> AuthService.excluirConta
 */

import type {
  Cidade,
  ID,
  PedidoDeRecalculo,
  PontoInteresse,
  PreferenciasRoteiro,
  ResumoRoteiro,
  Roteiro,
  Usuario,
  Visita,
} from '@/domain/types';

export interface RoteiroService {
  gerar(preferencias: PreferenciasRoteiro): Promise<Roteiro>;
  obter(id: ID): Promise<Roteiro>;
  listar(): Promise<ResumoRoteiro[]>;
  /** Remove um ponto e devolve o roteiro recalculado. */
  removerPonto(roteiroId: ID, pontoId: ID): Promise<Roteiro>;
  /** Troca um ponto pelo melhor substituto viável e recalcula. */
  substituirPonto(roteiroId: ID, pontoId: ID): Promise<Roteiro>;
  /** Refaz a seleção de pontos para um novo teto de gasto; null tira o teto. */
  ajustarOrcamento(roteiroId: ID, orcamento: number | null): Promise<Roteiro>;
  /**
   * "Recalcular daqui": refaz o que falta a partir da posição e da hora de
   * agora. As paradas em que a pessoa já chegou ficam como estão.
   */
  recalcularDaqui(roteiroId: ID, pedido: PedidoDeRecalculo): Promise<Roteiro>;
  /** Check-in na parada, com o valor pago na corrida quando o usuário informa. */
  registrarVisita(roteiroId: ID, pontoId: ID, custoRegistrado?: number): Promise<Visita>;
  /** Desfaz um check-in feito por engano. */
  desfazerVisita(roteiroId: ID, pontoId: ID): Promise<void>;
  excluir(roteiroId: ID): Promise<void>;
}

export interface CidadeService {
  listar(): Promise<Cidade[]>;
  buscar(termo: string): Promise<Cidade[]>;
}

export interface PontoService {
  obter(pontoId: ID): Promise<PontoInteresse>;
}

export interface AuthService {
  usuarioAtual(): Promise<Usuario | null>;
  entrar(email: string, senha: string): Promise<Usuario>;
  registrar(nome: string, email: string, senha: string): Promise<Usuario>;
  sair(): Promise<void>;
  /** Apaga a conta e tudo ligado a ela (LGPD, art. 18, VI) e encerra a sessão. */
  excluirConta(): Promise<void>;
}

export interface ServicosApp {
  roteiros: RoteiroService;
  cidades: CidadeService;
  pontos: PontoService;
  auth: AuthService;
}
