/**
 * Fluxo de cadastro: o aceite da Política de Privacidade é obrigatório, e o
 * Enter no último campo cadastra como o botão.
 */

import { ESPERA, abrirApp, esperar } from '@/testes/app';
import { fireEvent, screen, userEvent } from '@testing-library/react-native';

jest.setTimeout(30_000);

it('sem o aceite, o Enter não cadastra; com ele, cadastra e leva ao Início', async () => {
  const usuario = userEvent.setup();
  const app = abrirApp();

  await usuario.press(await screen.findByRole('button', { name: 'Criar conta' }, ESPERA));
  expect(app.getPathname()).toBe('/cadastro');

  // Os campos são preenchidos de uma vez (digitar letra por letra no app
  // inteiro é lento); o que este teste confere é o Enter.
  fireEvent.changeText(screen.getByLabelText('Nome'), 'Bia Teste');
  fireEvent.changeText(screen.getByLabelText('E-mail'), 'bia@exemplo.com');
  fireEvent.changeText(screen.getByLabelText('Senha'), 'senha-de-teste-1');
  fireEvent.changeText(screen.getByLabelText('Confirmar senha'), 'senha-de-teste-1');
  fireEvent(screen.getByLabelText('Confirmar senha'), 'submitEditing');

  // Sem o aceite, nada sai: o botão está desligado e o Enter também não envia.
  // A espera passa do tempo que o cadastro do modo de demonstração leva (1,1 s).
  expect(screen.getByRole('button', { name: 'Cadastrar' })).toBeDisabled();
  await esperar(1500);
  expect(app.getPathname()).toBe('/cadastro');
  expect(screen.queryByText('Olá, Bia Teste')).toBeNull();

  await usuario.press(screen.getByRole('checkbox'));
  fireEvent(screen.getByLabelText('Confirmar senha'), 'submitEditing');

  expect(await screen.findByText('Olá, Bia Teste', undefined, ESPERA)).toBeOnTheScreen();
  expect(app.getPathname()).toBe('/');
});
