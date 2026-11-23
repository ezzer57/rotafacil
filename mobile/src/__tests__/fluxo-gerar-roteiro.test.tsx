/**
 * Fluxo principal do trabalho: do Início ao roteiro montado pelo motor.
 */

import { ESPERA, abrirApp, entrar } from '@/testes/app';
import { screen, userEvent } from '@testing-library/react-native';

import { PONTOS } from '@dados/index';

const LUGARES_DE_QUIXADA = new Set(
  PONTOS.filter((p) => p.cidadeId === 'quixada').map((p) => p.nome),
);

jest.setTimeout(30_000);

it('tocar numa cidade abre a Nova rota com ela escolhida, e Gerar roteiro mostra as paradas', async () => {
  const usuario = userEvent.setup();
  const app = abrirApp();
  await entrar(usuario);

  // O cartão da cidade leva a cidade junto, no endereço da tela.
  await usuario.press(await screen.findByRole('button', { name: 'Nova rota em Quixadá' }, ESPERA));
  expect(app.getPathname()).toBe('/nova-rota');
  expect(app.getSearchParams()).toEqual({ cidadeId: 'quixada' });

  // O chip da cidade tem a bandeira antes do nome.
  expect(await screen.findByRole('radio', { name: /^\W+Quixadá$/ }, ESPERA)).toBeChecked();
  expect(screen.getByRole('radio', { name: /^\W+Fortaleza$/ })).not.toBeChecked();

  // Sem GPS, a partida fica no centro da cidade escolhida.
  expect(screen.getByRole('radio', { name: 'Centro de Quixadá' })).toBeChecked();

  await usuario.press(screen.getByRole('button', { name: 'Gerar roteiro' }));

  // O roteiro abre no lugar da Nova rota, com as paradas em ordem.
  expect(await screen.findByText('Seu percurso', undefined, ESPERA)).toBeOnTheScreen();
  expect(app.getPathname()).toMatch(/^\/roteiro\/.+/);
  expect(screen.getAllByText(/^1\. /).length).toBeGreaterThan(0);

  // E só com lugares da cidade escolhida: a cidade chegou até o motor.
  const paradas = screen
    .getAllByRole('button', { name: /^Cheguei em / })
    .map((botao) => String(botao.props.accessibilityLabel).replace('Cheguei em ', ''));
  expect(paradas.length).toBeGreaterThan(0);
  for (const parada of paradas) expect(LUGARES_DE_QUIXADA).toContain(parada);
});
