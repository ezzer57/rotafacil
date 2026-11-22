/**
 * Testes da tradução do roteiro calculado para o banco, sem banco.
 */

import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { gerarRoteiro, type Candidato } from '@/core/roteirizacao.js';
import type { ParametrosTarifa } from '@/core/tarifa.js';
import { paraGravacao, type PedidoDeRoteiro } from './gravacao.js';

const TARIFA: ParametrosTarifa = {
  bandeirada: 5.5,
  kmBandeira1: 3.2,
  kmBandeira2: 3.9,
  horaParada: 30,
  alfa: 0.82,
  alfaP10: 0.68,
  alfaP90: 1.1,
  norma: 'Tarifa de teste',
};

const ORIGEM = { lat: -4.9712, lng: -39.0156 };

const candidato = (id: string, kmAoNorte: number, faixaPreco: number | null = null): Candidato => ({
  id,
  nome: id,
  categoria: 'cultura',
  coordenada: { lat: ORIGEM.lat + kmAoNorte / 111.32, lng: ORIGEM.lng },
  nota: null,
  avaliacoes: 0,
  faixaPreco,
  tempoVisitaMin: 30,
  relevancia: 3,
  abreMin: null,
  fechaMin: null,
  arLivre: false,
});

const pedido = (orcamento: number | null): PedidoDeRoteiro => ({
  usuarioId: 'usuario-1',
  cidadeId: 'quixada',
  preferencias: {
    origem: ORIGEM,
    categorias: ['cultura'],
    orcamento,
    tempoDisponivelMin: 240,
    inicioPrevisto: new Date('2026-10-21T09:00:00'),
  },
  excluidos: ['tirado-antes'],
});

describe('paraGravacao', () => {
  // Um ponto perto (a pé, com custo no local) e um longe (de carro).
  const candidatos = [candidato('perto', 0.3, 1), candidato('longe', 4)];

  it('grava preferências, totais em Decimal e os pontos excluídos', () => {
    const entrada = pedido(80);
    const resultado = gerarRoteiro(candidatos, entrada.preferencias, TARIFA);
    const { roteiro } = paraGravacao(entrada, resultado, []);

    expect(roteiro.usuarioId).toBe('usuario-1');
    expect(roteiro.orcamento).toEqual(new Prisma.Decimal(80));
    expect(roteiro.pontosExcluidos).toEqual(['tirado-antes']);
    expect(roteiro.origemLat).toBe(ORIGEM.lat);
    expect(Number(roteiro.custoTransporteEst)).toBe(resultado.totais.custoTransporte.estimado);
    expect(Number(roteiro.custoLocais)).toBe(resultado.totais.custoLocais);
  });

  it('sem teto de gasto, grava orçamento nulo', () => {
    const entrada = pedido(null);
    const { roteiro } = paraGravacao(
      entrada,
      gerarRoteiro(candidatos, entrada.preferencias, TARIFA),
      [],
    );
    expect(roteiro.orcamento).toBeNull();
  });

  it('grava uma linha por parada, com o trecho, o traçado e a memória de cálculo', () => {
    const entrada = pedido(null);
    const resultado = gerarRoteiro(candidatos, entrada.preferencias, TARIFA);
    const tracado: [number, number][] = [
      [-4.97, -39.01],
      [-4.96, -39.01],
    ];
    const { itens } = paraGravacao(entrada, resultado, [tracado, null]);

    expect(itens.map((i) => i.pontoId)).toEqual(resultado.itens.map((i) => i.candidato.id));
    expect(itens.map((i) => i.ordem)).toEqual([1, 2]);
    expect(itens[0]!.trajeto).toEqual(tracado);
    expect(itens[1]!.trajeto).toBe(Prisma.JsonNull);

    for (const [i, item] of itens.entries()) {
      const trecho = resultado.itens[i]!.trechoAteAqui;
      expect(item.modal).toBe(trecho.modal);
      expect(Number(item.custoEst)).toBe(trecho.custo.estimado);
      // Trecho a pé não tem memória de cálculo da tarifa.
      if (trecho.modal === 'pe') expect(item.calculo).toBe(Prisma.JsonNull);
      else expect(item.calculo).toEqual(trecho.calculo);
    }
  });

  it('grava os descartados com motivo e detalhe', () => {
    const entrada = {
      ...pedido(null),
      preferencias: { ...pedido(null).preferencias, tempoDisponivelMin: 40 },
    };
    const resultado = gerarRoteiro(candidatos, entrada.preferencias, TARIFA);
    const { descartados } = paraGravacao(entrada, resultado, []);

    expect(descartados.length).toBeGreaterThan(0);
    expect(descartados).toEqual(
      resultado.descartados.map((d) => ({
        pontoId: d.candidato.id,
        motivo: d.motivo,
        detalhe: d.detalhe,
      })),
    );
  });
});
