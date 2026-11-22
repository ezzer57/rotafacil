/**
 * Acesso ao banco dos roteiros.
 *
 * Tudo o que o serviço de roteiros lê ou grava passa por aqui. O serviço fica
 * com as regras e a ordem dos passos; este arquivo, com as consultas.
 */

import { Prisma } from '@prisma/client';

import { haversine, type Coordenada } from '@/core/geo.js';
import type { Candidato, Categoria } from '@/core/roteirizacao.js';
import type { ParametrosTarifa } from '@/core/tarifa.js';
import { naoEncontrado, regraDeNegocio } from '@/lib/erros.js';
import { prisma } from '@/lib/prisma.js';
import type { RegistroDeRoteiro } from './gravacao.js';

/** Teto de candidatos levados ao motor, para manter o tempo de resposta. */
const MAX_CANDIDATOS = 40;

/** Tudo o que a tela do roteiro mostra. */
const incluirTudo = {
  cidade: true,
  itens: { include: { ponto: true } },
  descartados: { include: { ponto: true } },
  visitas: true,
} satisfies Prisma.RoteiroInclude;

/** A tarifa de táxi em vigor hoje na cidade. */
export async function carregarTarifa(cidadeId: string): Promise<ParametrosTarifa> {
  const agora = new Date();
  const tarifa = await prisma.tarifaTaxi.findFirst({
    where: {
      cidadeId,
      vigenciaInicio: { lte: agora },
      OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: agora } }],
    },
    orderBy: { vigenciaInicio: 'desc' },
  });

  if (!tarifa) {
    throw regraDeNegocio(
      'Esta cidade ainda não tem tarifa de táxi cadastrada, então não é possível estimar o custo',
    );
  }

  return {
    bandeirada: Number(tarifa.bandeirada),
    kmBandeira1: Number(tarifa.kmBandeira1),
    kmBandeira2: Number(tarifa.kmBandeira2),
    horaParada: Number(tarifa.horaParada),
    alfa: Number(tarifa.alfa),
    alfaP10: Number(tarifa.alfaP10),
    alfaP90: Number(tarifa.alfaP90),
    norma: tarifa.norma,
  };
}

/** Cidade informada pelo cliente ou, na falta dela, a mais próxima da origem. */
export async function resolverCidade(cidadeId: string | undefined, origem: Coordenada) {
  if (cidadeId) {
    const cidade = await prisma.cidade.findFirst({ where: { id: cidadeId, ativa: true } });
    if (!cidade) throw naoEncontrado('Cidade');
    return cidade;
  }

  const cidades = await prisma.cidade.findMany({ where: { ativa: true } });
  if (cidades.length === 0) throw regraDeNegocio('Nenhuma cidade cadastrada');

  return cidades
    .map((cidade) => ({
      cidade,
      distancia: haversine(origem, { lat: cidade.lat, lng: cidade.lng }),
    }))
    .sort((a, b) => a.distancia - b.distancia)[0]!.cidade;
}

/**
 * Os pontos candidatos: os pontos ativos da cidade, os mais relevantes
 * primeiro quando passam do limite.
 *
 * Não há corte por distância até a origem. Quem está num distrito a 30 km do
 * centro quer um roteiro pela cidade, e o tempo do primeiro trecho já entra
 * na conta do algoritmo. Cortar aqui deixava essa pessoa sem roteiro nenhum.
 */
export async function carregarCandidatos(
  cidadeId: string,
  excluir: string[],
): Promise<Candidato[]> {
  const pontos = await prisma.pontoInteresse.findMany({
    where: {
      cidadeId,
      // Ponto que saiu da lista continua no banco, mas fora de roteiro novo.
      ativo: true,
      id: { notIn: excluir.length > 0 ? excluir : undefined },
    },
    orderBy: [{ relevancia: 'desc' }, { avaliacoes: 'desc' }, { id: 'asc' }],
    take: MAX_CANDIDATOS,
  });

  return pontos.map((ponto) => ({
    id: ponto.id,
    nome: ponto.nome,
    categoria: ponto.categoria as Categoria,
    coordenada: { lat: ponto.lat, lng: ponto.lng },
    nota: ponto.nota,
    avaliacoes: ponto.avaliacoes,
    faixaPreco: ponto.faixaPreco,
    tempoVisitaMin: ponto.tempoVisitaMin,
    relevancia: ponto.relevancia,
    abreMin: ponto.abreMin,
    fechaMin: ponto.fechaMin,
    arLivre: ponto.arLivre,
  }));
}

/**
 * Carrega o roteiro de quem pede. Roteiro de outra pessoa responde como
 * inexistente: dizer "é de outro usuário" confirmaria que o identificador existe.
 */
export async function carregarDoUsuario(roteiroId: string, usuarioId: string) {
  const roteiro = await prisma.roteiro.findFirst({
    where: { id: roteiroId, usuarioId },
    include: incluirTudo,
  });
  if (!roteiro) throw naoEncontrado('Roteiro');
  return roteiro;
}

export type RoteiroGravado = Awaited<ReturnType<typeof carregarDoUsuario>>;

/** Uma página do histórico, do mais novo para o mais antigo. */
export async function listarDoUsuario(usuarioId: string, limite: number, pagina: number) {
  const [registros, total] = await Promise.all([
    prisma.roteiro.findMany({
      where: { usuarioId },
      include: { cidade: true, itens: { include: { ponto: true } }, visitas: true },
      orderBy: { criadoEm: 'desc' },
      take: limite,
      skip: (pagina - 1) * limite,
    }),
    prisma.roteiro.count({ where: { usuarioId } }),
  ]);
  return { registros, total };
}

/**
 * Grava o roteiro calculado ou, no recálculo, substitui o existente. Tudo ou
 * nada: um roteiro pela metade, sem itens, seria pior do que nenhum.
 */
export async function salvar(
  { roteiro, itens, descartados }: RegistroDeRoteiro,
  roteiroExistenteId?: string,
): Promise<RoteiroGravado> {
  return prisma.$transaction(async (tx) => {
    if (!roteiroExistenteId) {
      return tx.roteiro.create({
        data: { ...roteiro, itens: { create: itens }, descartados: { create: descartados } },
        include: incluirTudo,
      });
    }

    await tx.roteiroItem.deleteMany({ where: { roteiroId: roteiroExistenteId } });
    await tx.roteiroDescartado.deleteMany({ where: { roteiroId: roteiroExistenteId } });
    return tx.roteiro.update({
      where: { id: roteiroExistenteId },
      data: { ...roteiro, itens: { create: itens }, descartados: { create: descartados } },
      include: incluirTudo,
    });
  });
}

/** Registra a chegada a uma parada (ou atualiza o valor pago) e marca a parada. */
export async function registrarVisita(
  roteiroId: string,
  pontoId: string,
  custoRegistrado: number | undefined,
) {
  const custo = custoRegistrado == null ? null : new Prisma.Decimal(custoRegistrado);
  const [visita] = await prisma.$transaction([
    prisma.visita.upsert({
      where: { roteiroId_pontoId: { roteiroId, pontoId } },
      create: { roteiroId, pontoId, custoRegistrado: custo },
      update: { custoRegistrado: custo },
    }),
    prisma.roteiroItem.updateMany({ where: { roteiroId, pontoId }, data: { visitado: true } }),
  ]);
  return visita;
}

/** Apaga a visita e desmarca a parada. */
export async function apagarVisita(roteiroId: string, pontoId: string) {
  await prisma.$transaction([
    prisma.visita.delete({ where: { roteiroId_pontoId: { roteiroId, pontoId } } }),
    prisma.roteiroItem.updateMany({ where: { roteiroId, pontoId }, data: { visitado: false } }),
  ]);
}

/** Apaga o roteiro se ele for de quem pede; diz se havia o que apagar. */
export async function apagarDoUsuario(roteiroId: string, usuarioId: string): Promise<boolean> {
  const { count } = await prisma.roteiro.deleteMany({ where: { id: roteiroId, usuarioId } });
  return count > 0;
}
