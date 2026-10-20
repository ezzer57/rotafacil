/**
 * Serviço de roteiros.
 *
 * Orquestra: carrega os candidatos e a tarifa vigente, chama o motor (que é
 * código puro, em src/core) e grava o resultado. A gravação acontece em uma
 * transação: um roteiro pela metade, sem itens, seria pior do que nenhum.
 */

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma.js';
import { naoEncontrado, regraDeNegocio, semPermissao } from '@/lib/erros.js';
import { caixaEnvolvente, haversine } from '@/core/geo.js';
import {
  gerarRoteiro,
  type Candidato,
  type Categoria,
  type Preferencias,
} from '@/core/roteirizacao.js';
import type { ParametrosTarifa } from '@/core/tarifa.js';
import type { DadosGerarRoteiro } from '@/contratos/index.js';
import { serializarResumo, serializarRoteiro } from './serializador.js';

/** Raio de busca de pontos em torno da posição do usuário. */
const RAIO_BUSCA_KM = 15;
/** Teto de candidatos levados ao motor, para manter o tempo de resposta. */
const MAX_CANDIDATOS = 40;

const incluirTudo = {
  cidade: true,
  itens: { include: { ponto: true } },
  descartados: { include: { ponto: true } },
  visitas: true,
} satisfies Prisma.RoteiroInclude;

async function carregarTarifa(cidadeId: string): Promise<ParametrosTarifa> {
  const tarifa = await prisma.tarifaTaxi.findFirst({
    where: {
      cidadeId,
      vigenciaInicio: { lte: new Date() },
      OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: new Date() } }],
    },
    orderBy: { vigenciaInicio: 'desc' },
  });

  if (!tarifa) {
    throw regraDeNegocio(
      'Esta cidade ainda não tem tarifa calibrada, então não é possível estimar o custo',
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
async function resolverCidade(entrada: DadosGerarRoteiro) {
  if (entrada.cidadeId) {
    const cidade = await prisma.cidade.findFirst({
      where: { id: entrada.cidadeId, ativa: true },
    });
    if (!cidade) throw naoEncontrado('Cidade');
    return cidade;
  }

  const cidades = await prisma.cidade.findMany({ where: { ativa: true } });
  if (cidades.length === 0) throw regraDeNegocio('Nenhuma cidade cadastrada');

  return cidades
    .map((cidade) => ({
      cidade,
      distancia: haversine(entrada.origem, { lat: cidade.lat, lng: cidade.lng }),
    }))
    .sort((a, b) => a.distancia - b.distancia)[0]!.cidade;
}

/**
 * Busca os pontos candidatos.
 *
 * O filtro por caixa envolvente roda no banco, usando o índice, e o corte
 * exato por distância acontece depois, em memória. Isso evita calcular
 * haversine linha a linha sobre a tabela inteira.
 */
async function carregarCandidatos(
  cidadeId: string,
  origem: { lat: number; lng: number },
  excluir: string[],
): Promise<Candidato[]> {
  const caixa = caixaEnvolvente(origem, RAIO_BUSCA_KM);

  const pontos = await prisma.pontoInteresse.findMany({
    where: {
      cidadeId,
      id: { notIn: excluir.length > 0 ? excluir : undefined },
      lat: { gte: caixa.latMin, lte: caixa.latMax },
      lng: { gte: caixa.lngMin, lte: caixa.lngMax },
    },
    orderBy: [{ avaliacoes: 'desc' }],
    take: MAX_CANDIDATOS * 2,
  });

  return pontos
    .map((ponto) => ({
      ponto,
      distancia: haversine(origem, { lat: ponto.lat, lng: ponto.lng }),
    }))
    .filter(({ distancia }) => distancia <= RAIO_BUSCA_KM)
    .slice(0, MAX_CANDIDATOS)
    .map(({ ponto }) => ({
      id: ponto.id,
      nome: ponto.nome,
      categoria: ponto.categoria as Categoria,
      coordenada: { lat: ponto.lat, lng: ponto.lng },
      nota: ponto.nota,
      avaliacoes: ponto.avaliacoes,
      faixaPreco: ponto.faixaPreco,
      tempoVisitaMin: ponto.tempoVisitaMin,
      abreMin: ponto.abreMin,
      fechaMin: ponto.fechaMin,
    }));
}

interface DadosPersistencia {
  usuarioId: string;
  cidadeId: string;
  entrada: Preferencias & { categorias: Categoria[] };
  excluidos: string[];
  roteiroExistenteId?: string;
}

/** Executa o motor e grava o resultado, substituindo o roteiro quando é recálculo. */
async function calcularEGravar(dados: DadosPersistencia) {
  const tarifa = await carregarTarifa(dados.cidadeId);
  const candidatos = await carregarCandidatos(
    dados.cidadeId,
    dados.entrada.origem,
    dados.excluidos,
  );

  if (candidatos.length === 0) {
    throw regraDeNegocio('Nenhum ponto turístico encontrado perto da sua posição');
  }

  const resultado = gerarRoteiro(candidatos, dados.entrada, tarifa);

  const dadosRoteiro = {
    usuarioId: dados.usuarioId,
    cidadeId: dados.cidadeId,
    inicioPrevisto: dados.entrada.inicioPrevisto,
    orcamento: new Prisma.Decimal(dados.entrada.orcamento),
    tempoDisponivelMin: dados.entrada.tempoDisponivelMin,
    origemLat: dados.entrada.origem.lat,
    origemLng: dados.entrada.origem.lng,
    categorias: dados.entrada.categorias,
    pontosExcluidos: dados.excluidos,
    custoTransporteMin: new Prisma.Decimal(resultado.totais.custoTransporte.min),
    custoTransporteEst: new Prisma.Decimal(resultado.totais.custoTransporte.estimado),
    custoTransporteMax: new Prisma.Decimal(resultado.totais.custoTransporte.max),
    custoLocais: new Prisma.Decimal(resultado.totais.custoLocais),
    duracaoMin: resultado.totais.duracaoMin,
    distanciaKm: resultado.totais.distanciaKm,
    trechosAPe: resultado.totais.trechosAPe,
    economiaCaminhando: new Prisma.Decimal(resultado.totais.economiaCaminhando),
    diagnostico: resultado.diagnostico as unknown as Prisma.InputJsonValue,
  };

  const itens = resultado.itens.map((item) => ({
    pontoId: item.candidato.id,
    ordem: item.ordem,
    chegadaPrevista: item.chegadaPrevista,
    saidaPrevista: item.saidaPrevista,
    custoNoLocal: new Prisma.Decimal(item.custoNoLocal),
    modal: item.trechoAteAqui.modal,
    distanciaKm: item.trechoAteAqui.distanciaKm,
    duracaoMin: item.trechoAteAqui.duracaoMin,
    bandeira: item.trechoAteAqui.bandeira,
    custoMin: new Prisma.Decimal(item.trechoAteAqui.custo.min),
    custoEst: new Prisma.Decimal(item.trechoAteAqui.custo.estimado),
    custoMax: new Prisma.Decimal(item.trechoAteAqui.custo.max),
    calculo: item.trechoAteAqui.calculo
      ? (item.trechoAteAqui.calculo as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull,
  }));

  const descartados = resultado.descartados.map((d) => ({
    pontoId: d.candidato.id,
    motivo: d.motivo,
    detalhe: d.detalhe,
  }));

  // Tudo ou nada: itens e descartados acompanham o roteiro.
  return prisma.$transaction(async (tx) => {
    if (dados.roteiroExistenteId) {
      await tx.roteiroItem.deleteMany({ where: { roteiroId: dados.roteiroExistenteId } });
      await tx.roteiroDescartado.deleteMany({
        where: { roteiroId: dados.roteiroExistenteId },
      });

      return tx.roteiro.update({
        where: { id: dados.roteiroExistenteId },
        data: {
          ...dadosRoteiro,
          itens: { create: itens },
          descartados: { create: descartados },
        },
        include: incluirTudo,
      });
    }

    return tx.roteiro.create({
      data: { ...dadosRoteiro, itens: { create: itens }, descartados: { create: descartados } },
      include: incluirTudo,
    });
  });
}

/* -------------------------------------------------------- casos de uso */

export async function gerar(usuarioId: string, entrada: DadosGerarRoteiro) {
  const cidade = await resolverCidade(entrada);

  const roteiro = await calcularEGravar({
    usuarioId,
    cidadeId: cidade.id,
    entrada: {
      origem: entrada.origem,
      categorias: entrada.categorias as Categoria[],
      orcamento: entrada.orcamento,
      tempoDisponivelMin: entrada.tempoDisponivelMin,
      inicioPrevisto: entrada.inicioPrevisto,
    },
    excluidos: [],
  });

  return serializarRoteiro(roteiro);
}

/** Carrega o roteiro garantindo que ele pertence a quem está pedindo. */
async function carregarDoUsuario(roteiroId: string, usuarioId: string) {
  const roteiro = await prisma.roteiro.findUnique({
    where: { id: roteiroId },
    include: incluirTudo,
  });

  if (!roteiro) throw naoEncontrado('Roteiro');
  if (roteiro.usuarioId !== usuarioId) throw semPermissao('Este roteiro é de outro usuário');

  return roteiro;
}

export async function obter(usuarioId: string, roteiroId: string) {
  return serializarRoteiro(await carregarDoUsuario(roteiroId, usuarioId));
}

export async function listar(usuarioId: string, limite: number, pagina: number) {
  const [registros, total] = await Promise.all([
    prisma.roteiro.findMany({
      where: { usuarioId },
      include: { cidade: true, itens: { include: { ponto: true } } },
      orderBy: { criadoEm: 'desc' },
      take: limite,
      skip: (pagina - 1) * limite,
    }),
    prisma.roteiro.count({ where: { usuarioId } }),
  ]);

  return { itens: registros.map(serializarResumo), total, pagina, limite };
}

/** Remove ou troca um ponto, ou muda o orçamento, e recalcula o roteiro. */
export async function ajustar(
  usuarioId: string,
  roteiroId: string,
  operacao: { tipo: 'remover' | 'substituir'; pontoId: string } | { tipo: 'orcamento'; valor: number },
) {
  const atual = await carregarDoUsuario(roteiroId, usuarioId);

  const excluidos =
    operacao.tipo === 'orcamento'
      ? atual.pontosExcluidos
      : [...new Set([...atual.pontosExcluidos, operacao.pontoId])];

  const orcamento =
    operacao.tipo === 'orcamento' ? operacao.valor : Number(atual.orcamento);

  const roteiro = await calcularEGravar({
    usuarioId,
    cidadeId: atual.cidadeId,
    entrada: {
      origem: { lat: atual.origemLat, lng: atual.origemLng },
      categorias: atual.categorias as Categoria[],
      orcamento,
      tempoDisponivelMin: atual.tempoDisponivelMin,
      inicioPrevisto: atual.inicioPrevisto,
    },
    excluidos,
    roteiroExistenteId: atual.id,
  });

  return serializarRoteiro(roteiro);
}

export async function registrarVisita(
  usuarioId: string,
  roteiroId: string,
  pontoId: string,
  custoRegistrado?: number,
) {
  const roteiro = await carregarDoUsuario(roteiroId, usuarioId);

  const pertenceAoRoteiro = roteiro.itens.some((i) => i.pontoId === pontoId);
  if (!pertenceAoRoteiro) throw regraDeNegocio('Este ponto não faz parte do roteiro');

  const [visita] = await prisma.$transaction([
    prisma.visita.upsert({
      where: { roteiroId_pontoId: { roteiroId, pontoId } },
      create: {
        roteiroId,
        pontoId,
        custoRegistrado:
          custoRegistrado == null ? null : new Prisma.Decimal(custoRegistrado),
      },
      update: {
        custoRegistrado:
          custoRegistrado == null ? null : new Prisma.Decimal(custoRegistrado),
      },
    }),
    prisma.roteiroItem.updateMany({
      where: { roteiroId, pontoId },
      data: { visitado: true },
    }),
  ]);

  return {
    id: visita.id,
    roteiroId: visita.roteiroId,
    pontoId: visita.pontoId,
    chegadaEm: visita.chegadaEm.toISOString(),
    custoRegistrado: visita.custoRegistrado == null ? null : Number(visita.custoRegistrado),
  };
}

export async function excluir(usuarioId: string, roteiroId: string) {
  await carregarDoUsuario(roteiroId, usuarioId);
  await prisma.roteiro.delete({ where: { id: roteiroId } });
}
