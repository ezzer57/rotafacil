/**
 * Conversão dos registros do banco para o formato que o aplicativo consome.
 *
 * Duas responsabilidades vivem aqui, e em nenhum outro lugar:
 *  - transformar Decimal do Prisma em número, porque Decimal não tem
 *    representação natural em JSON;
 *  - recompor a forma do domínio (ponto, trecho, totais) a partir das
 *    tabelas normalizadas.
 */

import type { Prisma } from '@prisma/client';

const numero = (valor: Prisma.Decimal | number | null | undefined): number =>
  valor == null ? 0 : typeof valor === 'number' ? valor : Number(valor);

type PontoBanco = Prisma.PontoInteresseGetPayload<object>;

type RoteiroCompleto = Prisma.RoteiroGetPayload<{
  include: {
    cidade: true;
    itens: { include: { ponto: true } };
    descartados: { include: { ponto: true } };
    visitas: true;
  };
}>;

/** "08:00 às 17:00" a partir dos minutos guardados no banco. */
function horarioLegivel(ponto: PontoBanco): string | null {
  if (ponto.abreMin == null || ponto.fechaMin == null) return 'Aberto 24 horas';
  const formatar = (minutos: number) =>
    `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
  return `${formatar(ponto.abreMin)} às ${formatar(ponto.fechaMin)}`;
}

function abertoAgora(ponto: PontoBanco, momento = new Date()): boolean | null {
  if (ponto.abreMin == null || ponto.fechaMin == null) return true;
  const agora = momento.getHours() * 60 + momento.getMinutes();
  return agora >= ponto.abreMin && agora <= ponto.fechaMin;
}

export function serializarPonto(ponto: PontoBanco) {
  return {
    id: ponto.id,
    nome: ponto.nome,
    categoria: ponto.categoria,
    endereco: ponto.endereco,
    coordenada: { lat: ponto.lat, lng: ponto.lng },
    nota: ponto.nota,
    avaliacoes: ponto.avaliacoes,
    faixaPreco: ponto.faixaPreco,
    fotoUrl: ponto.fotoUrl,
    tempoVisitaMin: ponto.tempoVisitaMin,
    abertoAgora: abertoAgora(ponto),
    horarioHoje: horarioLegivel(ponto),
  };
}

export function serializarCidade(
  cidade: Prisma.CidadeGetPayload<object> & { tarifas?: unknown[] },
) {
  return {
    id: cidade.id,
    nome: cidade.nome,
    uf: cidade.uf,
    pais: cidade.pais,
    bandeira: cidade.bandeira,
    centro: { lat: cidade.lat, lng: cidade.lng },
    tarifaCalibrada: (cidade.tarifas?.length ?? 0) > 0,
  };
}

export function serializarRoteiro(roteiro: RoteiroCompleto) {
  const itens = [...roteiro.itens].sort((a, b) => a.ordem - b.ordem);
  const visitados = new Set(roteiro.visitas.map((v) => v.pontoId));

  const custoTransporte = {
    min: numero(roteiro.custoTransporteMin),
    estimado: numero(roteiro.custoTransporteEst),
    max: numero(roteiro.custoTransporteMax),
  };
  const custoLocais = numero(roteiro.custoLocais);
  // null quando o usuário não definiu teto de gasto.
  const orcamento = roteiro.orcamento == null ? null : numero(roteiro.orcamento);

  return {
    id: roteiro.id,
    cidadeId: roteiro.cidadeId,
    cidadeNome: roteiro.cidade.nome,
    criadoEm: roteiro.criadoEm.toISOString(),
    inicioPrevisto: roteiro.inicioPrevisto.toISOString(),
    orcamento,
    tempoDisponivelMin: roteiro.tempoDisponivelMin,

    itens: itens.map((item, indice) => ({
      ordem: item.ordem,
      ponto: serializarPonto(item.ponto),
      chegadaPrevista: item.chegadaPrevista.toISOString(),
      saidaPrevista: item.saidaPrevista.toISOString(),
      custoNoLocal: numero(item.custoNoLocal),
      visitado: item.visitado || visitados.has(item.pontoId),
      trechoAteAqui: item.modal
        ? {
            // A origem do primeiro trecho é a posição do usuário.
            origemId: indice === 0 ? 'origem' : itens[indice - 1]!.pontoId,
            destinoId: item.pontoId,
            modal: item.modal,
            distanciaKm: item.distanciaKm ?? 0,
            duracaoMin: item.duracaoMin ?? 0,
            bandeira: item.bandeira,
            custo: {
              min: numero(item.custoMin),
              estimado: numero(item.custoEst),
              max: numero(item.custoMax),
            },
            calculo: item.calculo ?? null,
          }
        : null,
    })),

    totais: {
      custoTransporte,
      custoLocais,
      custoTotal: {
        min: Math.round((custoTransporte.min + custoLocais) * 100) / 100,
        estimado: Math.round((custoTransporte.estimado + custoLocais) * 100) / 100,
        max: Math.round((custoTransporte.max + custoLocais) * 100) / 100,
      },
      duracaoMin: roteiro.duracaoMin,
      distanciaKm: roteiro.distanciaKm,
      usoOrcamento:
        orcamento == null
          ? null
          : Math.min(
              100,
              Math.round(
                ((custoTransporte.estimado + custoLocais) / Math.max(1, orcamento)) * 100,
              ),
            ),
      economiaCaminhando: numero(roteiro.economiaCaminhando),
      trechosAPe: roteiro.trechosAPe,
    },

    descartados: roteiro.descartados.map((d) => ({
      ponto: serializarPonto(d.ponto),
      motivo: d.motivo,
      detalhe: d.detalhe,
    })),

    diagnostico: roteiro.diagnostico,

    preferencias: {
      cidadeId: roteiro.cidadeId,
      origem: { lat: roteiro.origemLat, lng: roteiro.origemLng },
      categorias: roteiro.categorias,
      orcamento,
      tempoDisponivelMin: roteiro.tempoDisponivelMin,
      inicioPrevisto: roteiro.inicioPrevisto.toISOString(),
    },
  };
}

export function serializarResumo(
  roteiro: Prisma.RoteiroGetPayload<{
    include: { cidade: true; itens: { include: { ponto: true } } };
  }>,
) {
  const primeiro = [...roteiro.itens].sort((a, b) => a.ordem - b.ordem)[0];
  return {
    id: roteiro.id,
    cidadeNome: roteiro.cidade.nome,
    criadoEm: roteiro.criadoEm.toISOString(),
    totalPontos: roteiro.itens.length,
    custoEstimado:
      Math.round(
        (numero(roteiro.custoTransporteEst) + numero(roteiro.custoLocais)) * 100,
      ) / 100,
    capaUrl: primeiro?.ponto.fotoUrl ?? null,
  };
}
