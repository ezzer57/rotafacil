/**
 * Contratos de entrada da API.
 *
 * São os mesmos schemas Zod usados pelo aplicativo para validar formulários.
 * Manter um contrato único evita a situação clássica de o cliente aceitar um
 * dado que o servidor rejeita, ou o contrário.
 */

import { z } from 'zod';

export const SENHA_MINIMA = 8;
/**
 * O bcrypt só lê os primeiros 72 bytes da senha: o resto seria ignorado sem
 * aviso, e duas senhas longas com o mesmo começo valeriam igual.
 */
export const SENHA_MAXIMA_BYTES = 72;
const bytes = (texto: string) => new TextEncoder().encode(texto).length;

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
    .refine((senha) => bytes(senha) <= SENHA_MAXIMA_BYTES, 'A senha pode ter até 72 caracteres'),
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

/**
 * Limites dos valores em reais, os mesmos do aplicativo (mobile/src/domain/limites.ts),
 * medidos com os pontos cadastrados: nenhum roteiro de um dia passa de R$ 300
 * (acima disso o teto equivale a "sem limite"), e a corrida mais cara entre
 * dois pontos de uma cidade fica perto de R$ 90 (R$ 150 dá folga para a tarifa
 * dinâmica dos aplicativos).
 */
export const TETO_MAXIMO_REAIS = 300;
export const CORRIDA_MAXIMA_REAIS = 150;

export const gerarRoteiroSchema = z.object({
  /** Opcional: quando ausente, a cidade é deduzida da posição informada. */
  cidadeId: z.string().trim().min(1).max(60).optional(),
  origem: coordenadaSchema,
  categorias: z.array(categoriaSchema).max(6).default([]),
  /** Teto de gasto do dia. Ausente ou null: sem limite. */
  orcamento: z
    .number()
    .positive('O orçamento precisa ser maior que zero')
    .max(TETO_MAXIMO_REAIS, `O teto de gasto vai até R$ ${TETO_MAXIMO_REAIS}`)
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
    orcamento: z
      .number()
      .positive()
      .max(TETO_MAXIMO_REAIS, `O teto de gasto vai até R$ ${TETO_MAXIMO_REAIS}`)
      .nullable(),
  }),
]);

export const visitaSchema = z.object({
  pontoId: z.string().trim().min(1).max(120),
  /** Quanto o usuário pagou na corrida até este ponto, quando informa. */
  custoRegistrado: z
    .number()
    .nonnegative()
    .max(CORRIDA_MAXIMA_REAIS, `O valor da corrida vai até R$ ${CORRIDA_MAXIMA_REAIS}`)
    .optional(),
});

/* ------------------------------------------------------------- utilitários */

export const idParamSchema = z.object({ id: z.string().uuid('Identificador inválido') });

export const visitaParamSchema = idParamSchema.extend({
  pontoId: z.string().trim().min(1).max(120),
});

export const paginacaoSchema = z.object({
  limite: z.coerce.number().int().min(1).max(100).default(20),
  pagina: z.coerce.number().int().min(1).default(1),
});

export type DadosCadastro = z.infer<typeof cadastroSchema>;
export type DadosLogin = z.infer<typeof loginSchema>;
export type DadosGerarRoteiro = z.infer<typeof gerarRoteiroSchema>;
export type DadosAjustarRoteiro = z.infer<typeof ajustarRoteiroSchema>;
