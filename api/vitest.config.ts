import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Configuração mínima para os testes rodarem sem depender de um .env
    // local. Os testes de contrato HTTP não encostam no banco.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://rotafacil:rotafacil@localhost:5432/rotafacil_test?schema=public',
      JWT_SECRET: 'segredo-apenas-para-testes-com-mais-de-32-caracteres',
      LOG_LEVEL: 'silent',
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
