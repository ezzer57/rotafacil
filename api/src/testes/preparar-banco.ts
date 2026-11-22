/**
 * Preparo dos testes de integração: garante que o banco de teste existe e
 * está com todas as migrações. Não apaga nada; quem limpa as tabelas antes de
 * cada teste é `limparBanco`, e só num banco que pode ser limpo.
 */

import { execSync } from 'node:child_process';

import { conferirBancoDeTeste } from './banco-de-teste.js';

export default function prepararBanco() {
  const url = conferirBancoDeTeste(process.env.DATABASE_URL);
  const env = { ...process.env, DATABASE_URL: url };

  // Cria o banco se ainda não existir (no PostgreSQL do Docker, o banco de
  // teste fica ao lado do de desenvolvimento). Se já existir, o erro é ignorado.
  const manutencao = new URL(url);
  const nome = manutencao.pathname.replace(/^\//, '');
  manutencao.pathname = '/postgres';
  try {
    execSync(`npx prisma db execute --url "${manutencao}" --stdin`, {
      input: `CREATE DATABASE "${nome}"`,
      stdio: ['pipe', 'ignore', 'ignore'],
      env,
    });
  } catch {
    // Já existe, ou o servidor não deixa criar: a migração abaixo diz se faltar.
  }

  execSync('npx prisma migrate deploy', { stdio: 'inherit', env });
}
