/**
 * Check-in: a pessoa marca as chegadas durante o passeio e informa o que
 * pagou nas corridas. É o dado do histórico (hipótese 3) e o preço real que
 * mede a estimativa (hipótese 1).
 */

import { ESPERA, abrirApp, entrar, paradasDoExemplo } from '@/testes/app';
import { screen, userEvent } from '@testing-library/react-native';
import { testRouter } from 'expo-router/testing-library';

jest.setTimeout(30_000);

it('chegada a pé é um toque; de carro pergunta o valor; o Histórico soma as visitas', async () => {
  const { cidadeNome, aPe, deCarro } = await paradasDoExemplo();
  const usuario = userEvent.setup();
  abrirApp();
  await entrar(usuario);

  await usuario.press(
    await screen.findByRole(
      'button',
      { name: new RegExp(`^Abrir o roteiro de ${cidadeNome}`) },
      ESPERA,
    ),
  );

  // A pé: o check-in é direto.
  await usuario.press(await screen.findByRole('button', { name: `Cheguei em ${aPe}` }, ESPERA));
  expect(
    await screen.findByRole('button', { name: `Desfazer a chegada em ${aPe}` }, ESPERA),
  ).toBeOnTheScreen();

  // De carro: pergunta quanto a corrida custou.
  await usuario.press(screen.getByRole('button', { name: `Cheguei em ${deCarro}` }));
  await usuario.type(screen.getByPlaceholderText('Valor cobrado pelo aplicativo'), '18,50');
  await usuario.press(screen.getByRole('button', { name: `Registrar a chegada em ${deCarro}` }));
  expect(
    await screen.findByText(/pagou R\$\s18,50 na corrida/, undefined, ESPERA),
  ).toBeOnTheScreen();

  // O Histórico mostra as duas chegadas e o que foi pago.
  testRouter.back('/');
  await usuario.press(screen.getByRole('button', { name: 'Ver tudo' }));
  expect(
    await screen.findByText(
      /2 paradas visitadas · R\$\s18,50 pagos em corridas/,
      undefined,
      ESPERA,
    ),
  ).toBeOnTheScreen();
});
