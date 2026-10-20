/**
 * Regras de validacao dos formularios.
 *
 * Os mesmos schemas serao usados pelo backend Node.js para validar o corpo
 * das requisicoes. A validacao do aplicativo serve para dar resposta rapida
 * ao usuario; a validacao que vale do ponto de vista de seguranca e sempre a
 * do servidor, porque o cliente pode ser modificado.
 */

import { z } from 'zod';

/** Precisa acompanhar o valor exigido pela API (api/src/contratos). */
export const SENHA_MINIMA = 8;

export const schemaLogin = z.object({
  email: z
    .string()
    .min(1, 'Informe seu e-mail')
    .email('E-mail inválido'),
  senha: z
    .string()
    .min(1, 'Informe sua senha')
    .min(SENHA_MINIMA, `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres`),
});

export const schemaCadastro = z
  .object({
    nome: z.string().min(2, 'Informe seu nome'),
    email: z.string().min(1, 'Informe seu e-mail').email('E-mail inválido'),
    senha: z
      .string()
      .min(SENHA_MINIMA, `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres`),
    confirmacao: z.string(),
  })
  .refine((dados) => dados.senha === dados.confirmacao, {
    path: ['confirmacao'],
    message: 'As senhas não conferem',
  });

export type DadosLogin = z.infer<typeof schemaLogin>;
export type DadosCadastro = z.infer<typeof schemaCadastro>;

/** Converte o erro do Zod em um mapa campo -> primeira mensagem. */
export function errosPorCampo(erro: z.ZodError): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const problema of erro.issues) {
    const campo = String(problema.path[0] ?? '');
    if (campo && !mapa[campo]) mapa[campo] = problema.message;
  }
  return mapa;
}
