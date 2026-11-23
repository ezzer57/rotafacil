/**
 * "Recalcular daqui" (objetivo 7 do TCC): no meio do passeio, a pessoa refaz
 * o resto do roteiro, e as paradas em que já chegou ficam.
 *
 * Nos testes o GPS fica negado (ver src/testes/app.tsx): o resto parte da
 * última parada feita, e a tela diz isso.
 */

import { ESPERA, abrirApp, entrar, paradasDoExemplo } from '@/testes/app';
import { screen, userEvent } from '@testing-library/react-native';

jest.setTimeout(30_000);

it('refaz o resto a partir da última parada feita, que continua marcada', async () => {
  const { cidadeNome, aPe: nome } = await paradasDoExemplo();
  const usuario = userEvent.setup();
  abrirApp();
  await entrar(usuario);

  // O roteiro de exemplo foi feito ontem: o tempo dele já acabou.
  await usuario.press(
    await screen.findByRole(
      'button',
      { name: new RegExp(`^Abrir o roteiro de ${cidadeNome}`) },
      ESPERA,
    ),
  );
  // A pé, o check-in é um toque.
  await usuario.press(await screen.findByRole('button', { name: `Cheguei em ${nome}` }, ESPERA));
  await screen.findByRole('button', { name: `Desfazer a chegada em ${nome}` }, ESPERA);

  // Sem sobra no plano, a tela já vem com 2 horas marcadas.
  await usuario.press(screen.getByRole('button', { name: 'Recalcular daqui' }));
  expect(screen.getByRole('radio', { name: '2h' })).toBeChecked();
  await usuario.press(
    screen.getByRole('button', { name: 'Recalcular o resto do roteiro a partir daqui' }),
  );

  expect(
    await screen.findByText(
      /sem a sua localização: o resto saiu da última parada em que você chegou, com 2h livres/,
      undefined,
      ESPERA,
    ),
  ).toBeOnTheScreen();
  // A parada feita continua lá, marcada, e o resto tem paradas novas.
  expect(screen.getByRole('button', { name: `Desfazer a chegada em ${nome}` })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: `Cheguei em ${nome}` })).toBeNull();
  expect(screen.getAllByRole('button', { name: /^Cheguei em / }).length).toBeGreaterThan(0);
});
