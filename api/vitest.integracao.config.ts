/**
 * Testes de integração: a API inteira (HTTP, serviços e banco) contra um
 * PostgreSQL de verdade, com o servidor de rotas desligado.
 *
 * Os dados do banco de teste são APAGADOS antes de cada teste (a estrutura
 * fica, com as migrações aplicadas). Por isso o nome do banco precisa conter
 * "test"; outro banco só com PERMITIR_LIMPAR_BANCO=1 (a integração contínua
 * usa isso, porque o banco dela é descartável).
 *
 *   npm run db:up               # PostgreSQL do Docker
 *   npm run test:integracao     # usa rotafacil_test no mesmo servidor
 */

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const url =
  process.env.DATABASE_URL_TESTE ??
  'postgresql://rotafacil:rotafacil@localhost:5432/rotafacil_test?schema=public';

// O preparo do banco roda neste processo; os testes, nos processos filhos.
process.env.DATABASE_URL = url;

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.integracao.test.ts'],
    globalSetup: ['./src/testes/preparar-banco.ts'],
    // Os arquivos dividem o mesmo banco: um de cada vez.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: url,
      JWT_SECRET: 'segredo-apenas-para-testes-com-mais-de-32-caracteres',
      LOG_LEVEL: 'silent',
      ROTAS_PELAS_RUAS: 'false',
      RATE_LIMIT_CREDENCIAL_MAX: '1000',
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
