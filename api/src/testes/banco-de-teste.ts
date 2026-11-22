/**
 * Trava de segurança dos testes de integração: eles apagam as tabelas antes de
 * cada teste, então só rodam num banco com "test" no nome. Outro banco só com
 * PERMITIR_LIMPAR_BANCO=1, para bancos descartáveis (o da integração contínua).
 */

export function conferirBancoDeTeste(url: string | undefined): string {
  if (!url) throw new Error('DATABASE_URL não definida para os testes de integração');

  const nome = new URL(url).pathname.replace(/^\//, '');
  if (!/test/i.test(nome) && process.env.PERMITIR_LIMPAR_BANCO !== '1') {
    throw new Error(
      `Os testes de integração apagam os dados do banco "${nome}". Use um banco com "test" no ` +
        'nome (DATABASE_URL_TESTE) ou defina PERMITIR_LIMPAR_BANCO=1 se ele for descartável.',
    );
  }
  return url;
}
