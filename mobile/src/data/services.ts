/**
 * PONTO DE TROCA ENTRE MOCK E BACKEND.
 *
 * As telas nunca chamam fetch nem conhecem URL. Elas consomem estas
 * interfaces atraves dos hooks em src/hooks. Hoje a implementacao e
 * simulada (src/data/mock); quando a API estiver pronta, basta trocar a
 * fabrica usada em src/data/provider.tsx por createServicosHttp().
 *
 * Assinatura das operacoes espelha os endpoints planejados:
 *   POST   /v1/itineraries              -> RoteiroService.gerar
 *   GET    /v1/itineraries/:id          -> RoteiroService.obter
 *   GET    /v1/itineraries              -> RoteiroService.listar
 *   PATCH  /v1/itineraries/:id          -> RoteiroService.removerPonto / substituirPonto
 *   POST   /v1/itineraries/:id/checkins -> RoteiroService.registrarVisita
 *   GET    /v1/cities                   -> CidadeService.listar
 *   POST   /v1/sessions                 -> AuthService.entrar
 */

import type {
  Cidade,
  ID,
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
  registrarVisita(roteiroId: ID, pontoId: ID): Promise<Visita>;
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
}

export interface ServicosApp {
  roteiros: RoteiroService;
  cidades: CidadeService;
  pontos: PontoService;
  auth: AuthService;
}
