/**
 * Regras de autenticação.
 *
 * A senha nunca é guardada nem comparada em texto: o que vai para o banco é
 * um hash bcrypt com custo 12, e a verificação acontece pela própria
 * biblioteca, em tempo constante.
 */

import bcrypt from 'bcryptjs';

import { prisma } from '@/lib/prisma.js';
import { conflito, credencialInvalida, naoEncontrado } from '@/lib/erros.js';
import type { DadosCadastro, DadosLogin } from '@/contratos/index.js';

/** Custo 12: equilíbrio entre resistência a força bruta e tempo de resposta. */
const CUSTO_BCRYPT = 12;

/** Projeção pública do usuário: a senha jamais sai daqui. */
const CAMPOS_PUBLICOS = {
  id: true,
  nome: true,
  email: true,
  criadoEm: true,
} as const;

export async function cadastrar(dados: DadosCadastro) {
  const jaExiste = await prisma.usuario.findUnique({
    where: { email: dados.email },
    select: { id: true },
  });

  if (jaExiste) throw conflito('Este e-mail já está cadastrado');

  const senhaHash = await bcrypt.hash(dados.senha, CUSTO_BCRYPT);

  return prisma.usuario.create({
    data: { nome: dados.nome, email: dados.email, senhaHash },
    select: CAMPOS_PUBLICOS,
  });
}

export async function autenticarCredencial(dados: DadosLogin) {
  const usuario = await prisma.usuario.findUnique({ where: { email: dados.email } });

  // Mesmo sem usuário, compara contra um hash descartável para que o tempo
  // de resposta não denuncie se o e-mail existe (ataque por canal lateral).
  const hashParaComparar =
    usuario?.senhaHash ?? '$2a$12$invalidoinvalidoinvalidoinvalidoinvalidoinvalidoinva';

  const confere = await bcrypt.compare(dados.senha, hashParaComparar);

  if (!usuario || !confere) throw credencialInvalida();

  return { id: usuario.id, nome: usuario.nome, email: usuario.email, criadoEm: usuario.criadoEm };
}

export async function buscarPorId(id: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: CAMPOS_PUBLICOS,
  });
  if (!usuario) throw naoEncontrado('Usuário');
  return usuario;
}

export async function registrarConsentimento(
  usuarioId: string,
  tipo: string,
  versao: string,
) {
  return prisma.consentimento.upsert({
    where: { usuarioId_tipo_versao: { usuarioId, tipo, versao } },
    create: { usuarioId, tipo, versao },
    update: {},
  });
}

/**
 * Exclusão definitiva da conta e de tudo que está ligado a ela, incluindo
 * roteiros, visitas e coordenadas de origem (LGPD, art. 18, VI).
 */
export async function excluirConta(usuarioId: string) {
  await prisma.usuario.delete({ where: { id: usuarioId } });
}
