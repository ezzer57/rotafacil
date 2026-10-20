/**
 * Configuração da aplicação.
 *
 * As variáveis de ambiente são validadas na inicialização: se faltar algo ou
 * o valor estiver fora do formato, o processo não sobe. É preferível falhar
 * no start, com mensagem clara, a descobrir a configuração errada em produção
 * no meio de uma requisição.
 */

import 'dotenv/config';
import { z } from 'zod';

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),

  DATABASE_URL: z.string().url('DATABASE_URL precisa ser uma URL de conexão válida'),

  // Um segredo curto torna o JWT quebrável por força bruta.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa ter ao menos 32 caracteres'),
  JWT_EXPIRA_EM: z.string().default('7d'),

  CORS_ORIGENS: z
    .string()
    .default('')
    .transform((valor) =>
      valor
        .split(',')
        .map((origem) => origem.trim())
        .filter(Boolean),
    ),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

const resultado = esquema.safeParse(process.env);

if (!resultado.success) {
  const problemas = resultado.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  // Sem logger ainda: a configuração é pré-requisito dele.
  console.error(`\nConfiguração inválida. Confira o arquivo .env:\n${problemas}\n`);
  process.exit(1);
}

export const env = resultado.data;

export const emProducao = env.NODE_ENV === 'production';
export const emTeste = env.NODE_ENV === 'test';
