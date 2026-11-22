/**
 * Testes dos limites de valores em reais aceitos pela API.
 *
 * Os limites são os mesmos do aplicativo (mobile/src/domain/limites.ts) e
 * foram medidos com os pontos cadastrados.
 */

import { describe, expect, it } from 'vitest';

import {
  CORRIDA_MAXIMA_REAIS,
  TETO_MAXIMO_REAIS,
  ajustarRoteiroSchema,
  cadastroSchema,
  gerarRoteiroSchema,
  visitaSchema,
} from './index.js';

const pedido = (orcamento: unknown) => ({
  cidadeId: 'quixada',
  origem: { lat: -4.9712, lng: -39.0156 },
  orcamento,
  tempoDisponivelMin: 240,
  inicioPrevisto: '2026-11-20T12:00:00.000Z',
});

describe('teto de gasto', () => {
  it('aceita até o teto máximo e sem limite (null)', () => {
    expect(gerarRoteiroSchema.safeParse(pedido(TETO_MAXIMO_REAIS)).success).toBe(true);
    expect(gerarRoteiroSchema.safeParse(pedido(null)).success).toBe(true);
  });

  it('recusa teto acima do máximo, com mensagem clara', () => {
    const resultado = gerarRoteiroSchema.safeParse(pedido(TETO_MAXIMO_REAIS + 1));
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toContain(`R$ ${TETO_MAXIMO_REAIS}`);
  });

  it('vale também para o ajuste de teto de um roteiro pronto', () => {
    expect(
      ajustarRoteiroSchema.safeParse({ operacao: 'orcamento', orcamento: TETO_MAXIMO_REAIS + 1 })
        .success,
    ).toBe(false);
    expect(ajustarRoteiroSchema.safeParse({ operacao: 'orcamento', orcamento: 80 }).success).toBe(
      true,
    );
  });
});

describe('valor pago na corrida', () => {
  it('aceita até o limite e recusa acima dele', () => {
    expect(
      visitaSchema.safeParse({ pontoId: 'qx-catedral', custoRegistrado: CORRIDA_MAXIMA_REAIS })
        .success,
    ).toBe(true);
    expect(
      visitaSchema.safeParse({ pontoId: 'qx-catedral', custoRegistrado: CORRIDA_MAXIMA_REAIS + 1 })
        .success,
    ).toBe(false);
  });

  it('continua opcional', () => {
    expect(visitaSchema.safeParse({ pontoId: 'qx-catedral' }).success).toBe(true);
  });
});

describe('senha do cadastro', () => {
  const cadastro = (senha: string) => ({ nome: 'Ana', email: 'ana@teste.com', senha });

  it('aceita até 72 bytes, o que o bcrypt consegue ler', () => {
    expect(cadastroSchema.safeParse(cadastro('a'.repeat(72))).success).toBe(true);
  });

  it('recusa o que passa de 72 bytes, contando acento como dois', () => {
    expect(cadastroSchema.safeParse(cadastro('a'.repeat(73))).success).toBe(false);
    // 40 letras com acento ocupam 80 bytes.
    expect(cadastroSchema.safeParse(cadastro('ã'.repeat(40))).success).toBe(false);
  });
});
