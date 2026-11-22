import { fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';

import { renderizar } from '@/testes/renderizar';
import { ControleDoTeto } from '../controle-do-teto';

function montar(onMudarTeto: jest.Mock, orcamento: number | null = 80, bloqueado = false) {
  renderizar(
    <ControleDoTeto
      roteiroId="rot-1"
      orcamento={orcamento}
      recalculando={false}
      bloqueado={bloqueado}
      onMudarTeto={onMudarTeto}
    />,
  );
}

describe('ControleDoTeto', () => {
  it('tirar o limite pede o recálculo sem teto e já mostra "Sem limite"', () => {
    // O recálculo fica pendente, como na rede.
    const onMudarTeto = jest.fn(() => new Promise(() => {}));
    montar(onMudarTeto);

    fireEvent.press(screen.getByRole('button', { name: 'Tirar o teto de gasto' }));

    expect(onMudarTeto).toHaveBeenCalledWith(null);
    expect(screen.getByText('Sem limite')).toBeOnTheScreen();
  });

  it('se o recálculo falhar, volta a mostrar o teto que vale', async () => {
    const onMudarTeto = jest.fn(() => Promise.reject(new Error('Sem conexão com o servidor')));
    montar(onMudarTeto);

    fireEvent.press(screen.getByRole('button', { name: 'Tirar o teto de gasto' }));

    await waitFor(() => expect(screen.getByText(/R\$\s80,00/)).toBeOnTheScreen());
    expect(screen.queryByText('Sem limite')).toBeNull();
  });

  it('sem teto, convida a definir um e não oferece tirar o limite', () => {
    montar(jest.fn(), null);

    expect(screen.getByText('Quer definir um teto?')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Tirar o teto de gasto' })).toBeNull();
  });

  it('com outro recálculo em andamento, não deixa mexer no teto', async () => {
    const onMudarTeto = jest.fn(() => Promise.resolve());
    montar(onMudarTeto, 80, true);

    const tirar = screen.getByRole('button', { name: 'Tirar o teto de gasto' });
    expect(tirar).toBeDisabled();
    await userEvent.setup().press(tirar);
    expect(onMudarTeto).not.toHaveBeenCalled();
  });
});
