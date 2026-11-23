import { screen, userEvent } from '@testing-library/react-native';

import { renderizar } from '@/testes/renderizar';
import { itemDeExemplo, roteiroDeExemplo } from '@/testes/roteiro-de-exemplo';
import { RecalcularDaqui } from '../recalcular-daqui';

/** 11h47 em Quixadá: o roteiro de exemplo (9h às 13h) ainda tem 1h10. */
const AGORA = new Date('2026-11-25T11:47:00-03:00');
const AQUI = { lat: -4.95, lng: -39.02 };

function montar({
  roteiro = roteiroDeExemplo(),
  posicao = AQUI as typeof AQUI | null,
  onRecalcular = jest.fn(async () => undefined),
} = {}) {
  const lerPosicao = jest.fn(async () => posicao);
  renderizar(
    <RecalcularDaqui
      roteiro={roteiro}
      recalculando={false}
      bloqueado={false}
      onRecalcular={onRecalcular}
      lerPosicao={lerPosicao}
      agora={AGORA}
    />,
  );
  return { onRecalcular, lerPosicao };
}

describe('RecalcularDaqui', () => {
  it('pergunta o tempo com o que sobra já marcado, e lê a posição só ao confirmar', async () => {
    const usuario = userEvent.setup();
    const { onRecalcular, lerPosicao } = montar();

    await usuario.press(screen.getByRole('button', { name: 'Recalcular daqui' }));
    expect(screen.getByRole('radio', { name: 'Até as 13:00 (1h10)' })).toBeChecked();
    expect(lerPosicao).not.toHaveBeenCalled();

    await usuario.press(screen.getByRole('radio', { name: '3h' }));
    await usuario.press(
      screen.getByRole('button', { name: 'Recalcular o resto do roteiro a partir daqui' }),
    );

    expect(lerPosicao).toHaveBeenCalledTimes(1);
    expect(onRecalcular).toHaveBeenCalledWith({ origem: AQUI, tempoDisponivelMin: 180 });
  });

  it('se a sobra escolhida encolhe com o relógio, vale a sobra de agora', async () => {
    const usuario = userEvent.setup();
    const onRecalcular = jest.fn(async () => undefined);
    const lerPosicao = jest.fn(async () => AQUI);
    const props = {
      roteiro: roteiroDeExemplo(),
      recalculando: false,
      bloqueado: false,
      onRecalcular,
      lerPosicao,
    };
    const { rerender } = renderizar(<RecalcularDaqui {...props} agora={AGORA} />);

    await usuario.press(screen.getByRole('button', { name: 'Recalcular daqui' }));
    await usuario.press(screen.getByRole('radio', { name: 'Até as 13:00 (1h10)' }));
    // Seis minutos depois, a sobra é 1h05.
    rerender(<RecalcularDaqui {...props} agora={new Date(AGORA.getTime() + 6 * 60_000)} />);

    expect(screen.getByRole('radio', { name: 'Até as 13:00 (1h05)' })).toBeChecked();
    await usuario.press(
      screen.getByRole('button', { name: 'Recalcular o resto do roteiro a partir daqui' }),
    );
    expect(onRecalcular).toHaveBeenCalledWith({ origem: AQUI, tempoDisponivelMin: 65 });
  });

  it('sem a posição, pede o recálculo mesmo assim, sem origem', async () => {
    const usuario = userEvent.setup();
    const { onRecalcular } = montar({ posicao: null });

    await usuario.press(screen.getByRole('button', { name: 'Recalcular daqui' }));
    await usuario.press(
      screen.getByRole('button', { name: 'Recalcular o resto do roteiro a partir daqui' }),
    );

    expect(onRecalcular).toHaveBeenCalledWith({ origem: null, tempoDisponivelMin: 70 });
  });

  it('mostra o erro da API e deixa tentar de novo', async () => {
    const usuario = userEvent.setup();
    montar({
      onRecalcular: jest.fn(async () => {
        throw new Error('O ponto de partida está a 160 km de Quixadá.');
      }),
    });

    await usuario.press(screen.getByRole('button', { name: 'Recalcular daqui' }));
    await usuario.press(
      screen.getByRole('button', { name: 'Recalcular o resto do roteiro a partir daqui' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/160 km de Quixadá/);
    expect(
      screen.getByRole('button', { name: 'Recalcular o resto do roteiro a partir daqui' }),
    ).toBeEnabled();
  });

  it('depois do recálculo, conta como foi feito; e avisa quando nada mais coube', () => {
    montar({
      roteiro: roteiroDeExemplo({
        itens: [
          itemDeExemplo({ visita: { chegadaEm: AGORA.toISOString(), custoRegistrado: null } }),
        ],
        recalculo: {
          em: AGORA.toISOString(),
          origem: AQUI,
          tempoDisponivelMin: 60,
          de: 'ultima-parada',
        },
      }),
    });

    expect(screen.getByText(/Refeito às 11:47 sem a sua localização/)).toBeOnTheScreen();
    expect(screen.getByText(/Nada mais coube nesse tempo/)).toBeOnTheScreen();
  });
});
