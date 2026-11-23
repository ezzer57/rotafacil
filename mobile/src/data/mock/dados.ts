/**
 * Dados do modo de demonstração, no formato que a API devolve.
 *
 * Não há cópia dos pontos aqui: cidades, tarifas e pontos vêm da fonte única
 * da API (api/prisma/dados/index.ts, pelo atalho @dados), a mesma que a carga
 * do banco usa. Este arquivo só traduz para os tipos do aplicativo, como o
 * serializador da API faz.
 */

import {
  CIDADES as CIDADES_DADOS,
  PONTOS as PONTOS_DADOS,
  TARIFAS as TARIFAS_DADOS,
  janelaDoPonto,
  type PontoDados,
  type TarifaDados,
} from '@dados/index';
import { situacaoNoHorario } from '@motor/roteirizacao';

import type { Cidade, PontoInteresse } from '@/domain/types';

export type TarifaTaxi = TarifaDados;

export const CIDADES: Cidade[] = CIDADES_DADOS.map((cidade) => ({
  id: cidade.id,
  nome: cidade.nome,
  uf: cidade.uf,
  pais: cidade.pais,
  bandeira: cidade.bandeira,
  centro: { lat: cidade.lat, lng: cidade.lng },
  tarifaCalibrada: TARIFAS_DADOS.some((tarifa) => tarifa.cidadeId === cidade.id),
}));

/** Mesmo texto do serializador da API ("08:00 às 17:00"). */
function horarioLegivel(ponto: PontoDados): string {
  if (ponto.arLivre) return 'Ao ar livre, sem horário';
  if (!ponto.horario) return 'Aberto 24 horas';
  return `${ponto.horario.abre} às ${ponto.horario.fecha}`;
}

function paraPonto(ponto: PontoDados): PontoInteresse {
  return {
    id: ponto.id,
    nome: ponto.nome,
    categoria: ponto.categoria,
    endereco: ponto.endereco,
    coordenada: { lat: ponto.lat, lng: ponto.lng },
    // O OpenStreetMap não traz avaliações.
    nota: null,
    avaliacoes: 0,
    faixaPreco: ponto.faixaPreco,
    fotoUrl: ponto.foto?.url ?? null,
    fotoCredito: ponto.foto?.credito ?? null,
    fotoFonte: ponto.foto?.fonte ?? null,
    tempoVisitaMin: ponto.tempoVisitaMin,
    relevancia: ponto.relevancia,
    arLivre: ponto.arLivre,
    abertoAgora:
      situacaoNoHorario(
        { ...janelaDoPonto(ponto), arLivre: ponto.arLivre, tempoVisitaMin: 0 },
        new Date(),
      ) !== 'fechado',
    horarioHoje: horarioLegivel(ponto),
  };
}

export const PONTOS: PontoInteresse[] = PONTOS_DADOS.map(paraPonto);

/** Janela de funcionamento do ponto, em minutos, como o motor usa. */
export function janelaDoMock(id: string): { abreMin: number | null; fechaMin: number | null } {
  const ponto = PONTOS_DADOS.find((p) => p.id === id);
  return ponto ? janelaDoPonto(ponto) : { abreMin: null, fechaMin: null };
}

/** Cidade do modo de demonstração; um id que não existe é erro de programação. */
export function cidadeDoMock(id: string): Cidade {
  const cidade = CIDADES.find((c) => c.id === id);
  if (!cidade) throw new Error(`Cidade "${id}" não existe nos dados`);
  return cidade;
}

/** Tarifa da cidade no modo de demonstração. */
export function tarifaDoMock(cidadeId: string): TarifaTaxi {
  const tarifa = TARIFAS_DADOS.find((t) => t.cidadeId === cidadeId);
  if (!tarifa) throw new Error(`Cidade "${cidadeId}" sem tarifa nos dados`);
  return tarifa;
}

export const pontosPorCidade = (cidadeId: string) =>
  PONTOS.filter((ponto) => PONTOS_DADOS.find((p) => p.id === ponto.id)?.cidadeId === cidadeId);
