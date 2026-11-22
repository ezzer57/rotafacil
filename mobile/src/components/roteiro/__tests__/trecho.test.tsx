import { fireEvent, screen } from '@testing-library/react-native';

import { renderizar } from '@/testes/renderizar';
import { trechoAPe, trechoDeCarro } from '@/testes/roteiro-de-exemplo';
import { TrechoAteAqui } from '../trecho';

describe('TrechoAteAqui', () => {
  it('a pé, mostra que o trecho é grátis', () => {
    renderizar(<TrechoAteAqui trecho={trechoAPe} />);
    expect(screen.getByText('A pé · grátis')).toBeOnTheScreen();
  });

  it('de carro, mostra a faixa e a bandeira, e abre a memória de cálculo ao tocar', () => {
    renderizar(<TrechoAteAqui trecho={trechoDeCarro} />);
    const corrida = screen.getByRole('button', { name: /^Corrida de 3,2 km/ });

    expect(corrida).toBeCollapsed();
    expect(screen.queryByText('Como calculamos')).toBeNull();

    fireEvent.press(corrida);

    expect(corrida).toBeExpanded();
    expect(screen.getByText('Como calculamos')).toBeOnTheScreen();
    expect(screen.getByText('Tarifa de táxi (equação 8)')).toBeOnTheScreen();
    expect(screen.getByText('Fonte da tarifa: Tarifa de teste')).toBeOnTheScreen();
  });

  it('de carro sem memória de cálculo, não oferece o que abrir', () => {
    renderizar(<TrechoAteAqui trecho={{ ...trechoDeCarro, calculo: null }} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText('A pé · grátis')).toBeNull();
  });
});
