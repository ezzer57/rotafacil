/**
 * Fluxo de entrada: quem abre o app sem conta cai nas boas-vindas, e só
 * chega ao Início com a credencial certa.
 */

import { ESPERA, SENHA_DE_DEMONSTRACAO, abrirApp } from '@/testes/app';
import { screen, userEvent } from '@testing-library/react-native';

jest.setTimeout(30_000);

it('sem sessão, abre nas boas-vindas; senha errada avisa e não entra; a certa leva ao Início', async () => {
  const usuario = userEvent.setup();
  const app = abrirApp();

  // A guarda de rota manda para a entrada quem não está logado.
  const jaTenhoConta = await screen.findByRole('button', { name: 'Já tenho conta' }, ESPERA);
  expect(app.getPathname()).toBe('/boas-vindas');
  await usuario.press(jaTenhoConta);
  expect(app.getPathname()).toBe('/login');

  // E-mail fora do formato é barrado na própria tela. (A dica da
  // demonstração, sempre visível, também diz "e-mail válido": por isso o
  // texto exato.)
  await usuario.type(screen.getByPlaceholderText('E-mail'), 'ana');
  await usuario.press(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByText('E-mail inválido')).toBeOnTheScreen();

  // Senha errada: a mesma mensagem da API, e a pessoa continua no login.
  await usuario.clear(screen.getByPlaceholderText('E-mail'));
  await usuario.type(screen.getByPlaceholderText('E-mail'), 'ana@exemplo.com');
  await usuario.type(screen.getByPlaceholderText('Senha'), 'senha-errada');
  await usuario.press(screen.getByRole('button', { name: 'Entrar' }));
  expect(
    await screen.findByText('E-mail ou senha incorretos', undefined, ESPERA),
  ).toBeOnTheScreen();
  expect(app.getPathname()).toBe('/login');

  // Senha certa, enviada com Enter: entra e vê o Início com o próprio nome.
  await usuario.clear(screen.getByPlaceholderText('Senha'));
  await usuario.type(screen.getByPlaceholderText('Senha'), SENHA_DE_DEMONSTRACAO, {
    submitEditing: true,
  });
  expect(await screen.findByText('Olá, Ana', undefined, ESPERA)).toBeOnTheScreen();
  expect(app.getPathname()).toBe('/');
});
