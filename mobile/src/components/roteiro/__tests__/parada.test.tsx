import { fireEvent, screen, userEvent } from '@testing-library/react-native';

import { renderizar } from '@/testes/renderizar';
import { itemDeExemplo, trechoDeCarro } from '@/testes/roteiro-de-exemplo';
import { ParadaDoRoteiro } from '../parada';

const NOME = 'Museu Jacinto de Sousa';

function montar(parcial: Parameters<typeof itemDeExemplo>[0] = {}, ocupado = false) {
  const acoes = {
    onRemover: jest.fn(),
    onTrocar: jest.fn(),
    onCheckin: jest.fn(),
    onDesfazer: jest.fn(),
  };
  renderizar(
    <ParadaDoRoteiro
      item={itemDeExemplo(parcial)}
      ocupado={ocupado}
      registrando={false}
      {...acoes}
    />,
  );
  return acoes;
}

describe('ParadaDoRoteiro', () => {
  it('mostra a ordem, o nome e a hora prevista de chegada', () => {
    montar();
    expect(screen.getByText(`1. ${NOME}`)).toBeOnTheScreen();
    expect(screen.getByText('09:06')).toBeOnTheScreen();
  });

  it('os botões dizem ao leitor de tela de qual parada são', () => {
    const acoes = montar();

    fireEvent.press(screen.getByRole('button', { name: `Remover ${NOME} do roteiro` }));
    fireEvent.press(screen.getByRole('button', { name: `Trocar ${NOME} por outro lugar` }));

    expect(acoes.onRemover).toHaveBeenCalledTimes(1);
    expect(acoes.onTrocar).toHaveBeenCalledTimes(1);
  });

  it('lugar fechado na hora prevista aparece marcado, com o horário dele', () => {
    montar({ situacaoNoHorario: 'fechado' });
    expect(
      screen.getByText('Fechado nesse horário · funciona das 08:00 às 17:00'),
    ).toBeOnTheScreen();
  });

  it('chegando a pé, o check-in é direto, sem perguntar valor', () => {
    const acoes = montar();
    fireEvent.press(screen.getByRole('button', { name: `Cheguei em ${NOME}` }));
    expect(acoes.onCheckin).toHaveBeenCalledWith();
  });

  it('chegando de carro, pergunta quanto pagou e envia o valor', () => {
    const acoes = montar({ trechoAteAqui: trechoDeCarro });

    fireEvent.press(screen.getByRole('button', { name: `Cheguei em ${NOME}` }));
    fireEvent.changeText(screen.getByPlaceholderText('Valor cobrado pelo aplicativo'), '12,50');
    fireEvent.press(screen.getByRole('button', { name: `Registrar a chegada em ${NOME}` }));

    expect(acoes.onCheckin).toHaveBeenCalledWith(12.5);
  });

  it('parada visitada mostra a chegada, não se troca nem se remove, e pode ser desfeita', () => {
    const acoes = montar({
      visita: { chegadaEm: '2026-11-25T12:10:00.000Z', custoRegistrado: 14 },
    });

    expect(screen.getByText(/Chegou às 09:10 · pagou R\$\s14,00 na corrida/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: `Remover ${NOME} do roteiro` })).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: `Desfazer a chegada em ${NOME}` }));
    expect(acoes.onDesfazer).toHaveBeenCalledTimes(1);
  });

  it('enquanto o roteiro é recalculado, trocar e remover ficam desligados', async () => {
    const acoes = montar({}, true);
    const remover = screen.getByRole('button', { name: `Remover ${NOME} do roteiro` });

    expect(remover).toBeDisabled();
    // userEvent toca como um dedo; o fireEvent acharia o onPress do componente
    // de fora mesmo com o botão desligado.
    await userEvent.setup().press(remover);
    expect(acoes.onRemover).not.toHaveBeenCalled();
  });
});
