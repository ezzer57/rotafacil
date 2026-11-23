/**
 * Hooks de acesso a dados.
 *
 * As telas usam somente estes hooks. Elas nao sabem se o dado veio do mock
 * ou da API, o que mantem a camada visual estavel na virada para o backend.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { chaves } from '@/data/chaves';
import { useServicos } from '@/data/provider';
import type { ID, PedidoDeRecalculo, PreferenciasRoteiro, Roteiro } from '@/domain/types';

export { chaves };

export function useCidades() {
  const { cidades } = useServicos();
  return useQuery({ queryKey: chaves.cidades, queryFn: () => cidades.listar() });
}

export function useHistorico() {
  const { roteiros } = useServicos();
  return useQuery({ queryKey: chaves.roteiros, queryFn: () => roteiros.listar() });
}

export function useRoteiro(id: ID | undefined) {
  const { roteiros } = useServicos();
  return useQuery({
    queryKey: chaves.roteiro(id ?? 'novo'),
    queryFn: () => roteiros.obter(id!),
    enabled: Boolean(id),
  });
}

export function usePonto(id: ID | undefined) {
  const { pontos } = useServicos();
  return useQuery({
    queryKey: chaves.ponto(id ?? ''),
    queryFn: () => pontos.obter(id!),
    enabled: Boolean(id),
  });
}

export function useUsuario() {
  const { auth } = useServicos();
  return useQuery({ queryKey: chaves.usuario, queryFn: () => auth.usuarioAtual() });
}

/* ------------------------------------------------------------- autenticacao */

export function useEntrar() {
  const { auth } = useServicos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, senha }: { email: string; senha: string }) => auth.entrar(email, senha),
    onSuccess: (usuario) => qc.setQueryData(chaves.usuario, usuario),
  });
}

export function useRegistrar() {
  const { auth } = useServicos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nome, email, senha }: { nome: string; email: string; senha: string }) =>
      auth.registrar(nome, email, senha),
    onSuccess: (usuario) => qc.setQueryData(chaves.usuario, usuario),
  });
}

export function useSair() {
  const { auth } = useServicos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => auth.sair(),
    onSuccess: () => {
      qc.setQueryData(chaves.usuario, null);
      qc.clear(); // nao deixa dados do usuario anterior em cache
    },
  });
}

export function useExcluirConta() {
  const { auth } = useServicos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => auth.excluirConta(),
    onSuccess: () => {
      qc.setQueryData(chaves.usuario, null);
      qc.clear(); // nada da conta apagada pode ficar em cache
    },
  });
}

export function useGerarRoteiro() {
  const { roteiros } = useServicos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (preferencias: PreferenciasRoteiro) => roteiros.gerar(preferencias),
    onSuccess: (roteiro) => {
      qc.setQueryData(chaves.roteiro(roteiro.id), roteiro);
      qc.invalidateQueries({ queryKey: chaves.roteiros });
    },
  });
}

/** Apaga um roteiro do histórico (e da API), com as paradas e as visitas. */
export function useExcluirRoteiro() {
  const { roteiros } = useServicos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roteiroId: ID) => roteiros.excluir(roteiroId),
    onSuccess: (_, roteiroId) => {
      qc.removeQueries({ queryKey: chaves.roteiro(roteiroId) });
      void qc.invalidateQueries({ queryKey: chaves.roteiros });
    },
  });
}

export function useAjustarRoteiro(roteiroId: ID | undefined) {
  const { roteiros } = useServicos();
  const qc = useQueryClient();

  // O roteiro recalculado substitui o do cache, e o histórico, que mostra o
  // custo e o número de paradas, é relido.
  const aplicarRecalculo = (roteiro: Roteiro) => {
    qc.setQueryData(chaves.roteiro(roteiro.id), roteiro);
    void qc.invalidateQueries({ queryKey: chaves.roteiros });
  };

  const remover = useMutation({
    mutationFn: (pontoId: ID) => roteiros.removerPonto(roteiroId!, pontoId),
    onSuccess: aplicarRecalculo,
  });

  const substituir = useMutation({
    mutationFn: (pontoId: ID) => roteiros.substituirPonto(roteiroId!, pontoId),
    onSuccess: aplicarRecalculo,
  });

  const ajustarOrcamento = useMutation({
    mutationFn: (orcamento: number | null) => roteiros.ajustarOrcamento(roteiroId!, orcamento),
    onSuccess: aplicarRecalculo,
  });

  const recalcularDaqui = useMutation({
    mutationFn: (pedido: PedidoDeRecalculo) => roteiros.recalcularDaqui(roteiroId!, pedido),
    onSuccess: aplicarRecalculo,
  });

  // O check-in muda a parada e o historico, entao os dois sao relidos.
  const atualizarAposVisita = () => {
    void qc.invalidateQueries({ queryKey: chaves.roteiro(roteiroId!) });
    void qc.invalidateQueries({ queryKey: chaves.roteiros });
  };

  const registrarVisita = useMutation({
    mutationFn: ({ pontoId, custoRegistrado }: { pontoId: ID; custoRegistrado?: number }) =>
      roteiros.registrarVisita(roteiroId!, pontoId, custoRegistrado),
    onSuccess: atualizarAposVisita,
  });

  const desfazerVisita = useMutation({
    mutationFn: (pontoId: ID) => roteiros.desfazerVisita(roteiroId!, pontoId),
    onSuccess: atualizarAposVisita,
  });

  return {
    remover,
    substituir,
    ajustarOrcamento,
    recalcularDaqui,
    registrarVisita,
    desfazerVisita,
  };
}
