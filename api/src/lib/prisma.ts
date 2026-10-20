/**
 * Cliente do banco.
 *
 * Uma única instância para todo o processo: cada PrismaClient abre seu
 * próprio pool de conexões, e vários clientes esgotariam o limite do
 * PostgreSQL. O `globalThis` evita duplicar a instância quando o tsx
 * recarrega o código em desenvolvimento.
 */

import { PrismaClient } from '@prisma/client';

import { emProducao } from '@/config/env.js';

const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalParaPrisma.prisma ??
  new PrismaClient({
    log: emProducao ? ['warn', 'error'] : ['warn', 'error'],
  });

if (!emProducao) globalParaPrisma.prisma = prisma;
