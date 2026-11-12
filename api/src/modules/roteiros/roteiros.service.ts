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
import { haversine } from '@/core/geo.js';
import { clienteDeRotas, type Tracado } from '@/lib/rotas.js';
import {
  gerarRoteiro,
  type Candidato,
  type Categoria,
  type Preferencias,
} from '@/core/roteirizacao.js';
import type { ParametrosTarifa } from '@/core/tarifa.js';
import type { DadosGerarRoteiro } from '@/contratos/index.js';
import { serializarResumo, serializarRoteiro } from './serializador.js';

/**
 * Distância máxima entre o ponto de partida e o centro da cidade. É o mesmo
 * raio que o aplicativo usa para decidir se parte do GPS ou do centro: os
 * dois precisam concordar, senão o app manda uma posição que a API recusa.
 */
const RAIO_COBERTURA_CIDADE_KM = 60;
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
 * Busca os pontos candidatos: os pontos ativos da cidade.
 *
 * Não há corte por distância até a origem. Quem está num distrito a 30 km do
 * centro quer um roteiro pela cidade, e o tempo do primeiro trecho já entra
 * na conta do algoritmo. Cortar aqui deixava essa pessoa sem roteiro nenhum.
 */
async function carregarCandidatos(cidadeId: string, excluir: string[]): Promise<Candidato[]> {
  const pontos = await prisma.pontoInteresse.findMany({
    where: {
      cidadeId,
      // Ponto que saiu da lista continua no banco, mas fora de roteiro novo.
      ativo: true,
      id: { notIn: excluir.length > 0 ? excluir : undefined },
    },
    orderBy: [{ avaliacoes: 'desc' }, { id: 'asc' }],
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
  }));
}

interface TrechoParaTracar {
  de: { lat: number; lng: number };
  para: { lat: number; lng: number };
  modal: 'pe' | 'app';
  pelasRuas: boolean;
}

/** Só traça o que foi medido pelas ruas; o resto fica sem desenho. */
async function tracarTrechos(trechos: TrechoParaTracar[]): Promise<(Tracado | null)[]> {
  if (!clienteDeRotas) return trechos.map(() => null);
  return Promise.all(
    trechos.map((t) =>
      t.pelasRuas ? clienteDeRotas!.tracar(t.modal === 'pe' ? 'pe' : 'carro', t.de, t.para) : null,
    ),
  );
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
  const candidatos = await carregarCandidatos(dados.cidadeId, dados.excluidos);

  if (candidatos.length === 0) {
    throw regraDeNegocio('Esta cidade ainda não tem pontos turísticos cadastrados');
  }

  // Uma só consulta mede todos os pares de pontos; sem resposta, o motor usa
  // a estimativa em linha reta e o roteiro diz isso.
  const medidor =
    (await clienteDeRotas?.medirTudo([
      dados.entrada.origem,
      ...candidatos.map((c) => c.coordenada),
    ])) ?? undefined;

  const resultado = gerarRoteiro(candidatos, dados.entrada, tarifa, medidor);

  // Ruas de cada trecho medido, para desenhar no mapa.
  const tracados = await tracarTrechos(resultado.itens.map((item, i) => ({
    de: i === 0 ? dados.entrada.origem : resultado.itens[i - 1]!.candidato.coordenada,
    para: item.candidato.coordenada,
    modal: item.trechoAteAqui.modal,
    pelasRuas: item.trechoAteAqui.fonte === 'ruas',
  })));

  const dadosRoteiro = {
    usuarioId: dados.usuarioId,
    cidadeId: dados.cidadeId,
    inicioPrevisto: dados.entrada.inicioPrevisto,
    orcamento:
      dados.entrada.orcamento == null ? null : new Prisma.Decimal(dados.entrada.orcamento),
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
    fonteRota: item.trechoAteAqui.fonte,
    trajeto: tracados[item.ordem - 1]
      ? (tracados[item.ordem - 1] as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull,
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

  const distanciaDoCentro = haversine(entrada.origem, { lat: cidade.lat, lng: cidade.lng });
  if (distanciaDoCentro > RAIO_COBERTURA_CIDADE_KM) {
    throw regraDeNegocio(
      `O ponto de partida está a ${Math.round(distanciaDoCentro)} km de ${cidade.nome}. ` +
        'Escolha partir do centro da cidade.',
    );
  }

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
      include: { cidade: true, itens: { include: { ponto: true } }, visitas: true },
      orderBy: { criadoEm: 'desc' },
      take: limite,
      skip: (pagina - 1) * limite,
    }),
    prisma.roteiro.count({ where: { usuarioId } }),
  ]);

  return { itens: registros.map(serializarResumo), total, pagina, limite };
}

/**
 * Remove ou troca um ponto, ou muda o teto de gasto (null tira o teto), e
 * recalcula o roteiro.
 */
export async function ajustar(
  usuarioId: string,
  roteiroId: string,
  operacao:
    | { tipo: 'remover' | 'substituir'; pontoId: string }
    | { tipo: 'orcamento'; valor: number | null },
) {
  const atual = await carregarDoUsuario(roteiroId, usuarioId);

  const excluidos =
    operacao.tipo === 'orcamento'
      ? atual.pontosExcluidos
      : [...new Set([...atual.pontosExcluidos, operacao.pontoId])];

  const orcamentoAtual = atual.orcamento == null ? null : Number(atual.orcamento);
  const orcamento = operacao.tipo === 'orcamento' ? operacao.valor : orcamentoAtual;

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

/** Desfaz um check-in feito por engano: apaga a visita e desmarca a parada. */
export async function desfazerVisita(usuarioId: string, roteiroId: string, pontoId: string) {
  const roteiro = await carregarDoUsuario(roteiroId, usuarioId);
  if (!roteiro.visitas.some((v) => v.pontoId === pontoId)) throw naoEncontrado('Check-in');

  await prisma.$transaction([
    prisma.visita.delete({ where: { roteiroId_pontoId: { roteiroId, pontoId } } }),
    prisma.roteiroItem.updateMany({ where: { roteiroId, pontoId }, data: { visitado: false } }),
  ]);
}

export async function excluir(usuarioId: string, roteiroId: string) {
  await carregarDoUsuario(roteiroId, usuarioId);
  await prisma.roteiro.delete({ where: { id: roteiroId } });
}
