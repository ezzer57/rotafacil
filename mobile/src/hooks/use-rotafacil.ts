/**
 * Hooks de acesso a dados.
 *
 * As telas usam somente estes hooks. Elas nao sabem se o dado veio do mock
 * ou da API, o que mantem a camada visual estavel na virada para o backend.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useServicos } from '@/data/provider';
import type { ID, PreferenciasRoteiro } from '@/domain/types';

export const chaves = {
  cidades: ['cidades'] as const,
  roteiros: ['roteiros'] as const,
  roteiro: (id: ID) => ['roteiro', id] as const,
  ponto: (id: ID) => ['ponto', id] as const,
  usuario: ['usuario'] as const,
};

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
    mutationFn: ({ email, senha }: { email: string; senha: string }) =>
      auth.entrar(email, senha),
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

export function useAjustarRoteiro(roteiroId: ID | undefined) {
  const { roteiros } = useServicos();
  const qc = useQueryClient();

  const remover = useMutation({
    mutationFn: (pontoId: ID) => roteiros.removerPonto(roteiroId!, pontoId),
    onSuccess: (roteiro) => qc.setQueryData(chaves.roteiro(roteiro.id), roteiro),
  });

  const substituir = useMutation({
    mutationFn: (pontoId: ID) => roteiros.substituirPonto(roteiroId!, pontoId),
    onSuccess: (roteiro) => qc.setQueryData(chaves.roteiro(roteiro.id), roteiro),
  });

  const ajustarOrcamento = useMutation({
    mutationFn: (orcamento: number) => roteiros.ajustarOrcamento(roteiroId!, orcamento),
    onSuccess: (roteiro) => qc.setQueryData(chaves.roteiro(roteiro.id), roteiro),
  });

  const registrarVisita = useMutation({
    mutationFn: (pontoId: ID) => roteiros.registrarVisita(roteiroId!, pontoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.roteiro(roteiroId!) }),
  });

  return { remover, substituir, ajustarOrcamento, registrarVisita };
}
