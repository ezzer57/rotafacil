/**
 * Contratos de entrada da API.
 *
 * São os mesmos schemas Zod usados pelo aplicativo para validar formulários.
 * Manter um contrato único evita a situação clássica de o cliente aceitar um
 * dado que o servidor rejeita, ou o contrário.
 */

import { z } from 'zod';

export const SENHA_MINIMA = 8;

export const categoriaSchema = z.enum([
  'cultura',
  'natureza',
  'gastronomia',
  'compras',
  'vidaNoturna',
  'religioso',
]);

export const coordenadaSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/* ------------------------------------------------------------ autenticação */

export const cadastroSchema = z.object({
  nome: z.string().trim().min(2, 'Informe seu nome').max(120),
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(180),
  senha: z
    .string()
    .min(SENHA_MINIMA, `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres`)
    .max(200, 'Senha longa demais'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  senha: z.string().min(1, 'Informe sua senha').max(200),
});

export const consentimentoSchema = z.object({
  tipo: z.string().trim().min(2).max(60),
  versao: z.string().trim().min(1).max(20),
});

/* ---------------------------------------------------------------- roteiros */

export const gerarRoteiroSchema = z.object({
  /** Opcional: quando ausente, a cidade é deduzida da posição informada. */
  cidadeId: z.string().trim().min(1).max(60).optional(),
  origem: coordenadaSchema,
  categorias: z.array(categoriaSchema).max(6).default([]),
  /** Teto de gasto do dia. Ausente ou null: sem limite. */
  orcamento: z
    .number()
    .positive('O orçamento precisa ser maior que zero')
    .max(100_000, 'Orçamento acima do limite aceito')
    .nullish()
    .transform((valor) => valor ?? null),
  tempoDisponivelMin: z
    .number()
    .int()
    .min(30, 'Informe ao menos 30 minutos')
    .max(1440, 'O roteiro é planejado para um único dia'),
  inicioPrevisto: z.coerce.date(),
});

export const ajustarRoteiroSchema = z.discriminatedUnion('operacao', [
  z.object({ operacao: z.literal('remover'), pontoId: z.string().min(1).max(120) }),
  z.object({ operacao: z.literal('substituir'), pontoId: z.string().min(1).max(120) }),
  z.object({
    operacao: z.literal('orcamento'),
    /** null tira o teto de gasto. */
    orcamento: z.number().positive().max(100_000).nullable(),
  }),
]);

export const visitaSchema = z.object({
  pontoId: z.string().trim().min(1).max(120),
  custoRegistrado: z.number().nonnegative().max(100_000).optional(),
});

/* ------------------------------------------------------------- utilitários */

export const idParamSchema = z.object({ id: z.string().uuid('Identificador inválido') });

export const paginacaoSchema = z.object({
  limite: z.coerce.number().int().min(1).max(100).default(20),
  pagina: z.coerce.number().int().min(1).default(1),
});

export type DadosCadastro = z.infer<typeof cadastroSchema>;
export type DadosLogin = z.infer<typeof loginSchema>;
export type DadosGerarRoteiro = z.infer<typeof gerarRoteiroSchema>;
export type DadosAjustarRoteiro = z.infer<typeof ajustarRoteiroSchema>;
