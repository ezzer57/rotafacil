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

  // Fuso das contas de horário: bandeira do táxi e horário de funcionamento.
  // Sem ele valeria o relógio do servidor, que em hospedagem costuma estar em
  // UTC, três horas à frente de Quixadá. Nome próprio, e não TZ, porque muitas
  // hospedagens já definem TZ=UTC por conta própria.
  FUSO_HORARIO: z
    .string()
    .default('America/Fortaleza')
    .refine((fuso) => {
      try {
        new Intl.DateTimeFormat('pt-BR', { timeZone: fuso });
        return true;
      } catch {
        return false;
      }
    }, 'FUSO_HORARIO precisa ser um fuso válido, ex.: America/Fortaleza'),

  // Distância e tempo pelas ruas, vindos de um servidor OSRM. Desligado nos
  // testes, que não podem depender de rede. Se o servidor não responder, o
  // roteiro sai com a estimativa em linha reta, e o aplicativo avisa.
  ROTAS_PELAS_RUAS: z
    .enum(['true', 'false'])
    .optional()
    .transform((valor) => (valor ? valor === 'true' : process.env.NODE_ENV !== 'test')),
  // Os servidores públicos são de demonstração (sem garantia de disponibilidade
  // nem de volume). Para a apresentação, aponte para um OSRM próprio.
  OSRM_URL_CARRO: z.string().url().default('https://router.project-osrm.org'),
  OSRM_URL_A_PE: z.string().url().default('https://routing.openstreetmap.de/routed-foot'),
  OSRM_TIMEOUT_MS: z.coerce.number().int().positive().default(6000),
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

// Vale para o processo inteiro, antes de qualquer cálculo com datas.
process.env.TZ = env.FUSO_HORARIO;

export const emProducao = env.NODE_ENV === 'production';
export const emTeste = env.NODE_ENV === 'test';
