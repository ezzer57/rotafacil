import { fireEvent, screen } from '@testing-library/react-native';

import type { ResumoRoteiro } from '@/domain/types';
import { renderizar } from '@/testes/renderizar';
import { CartaoDoRoteiro } from '../cartao-do-roteiro';

const resumo: ResumoRoteiro = {
  id: 'rot-1',
  cidadeNome: 'Quixadá',
  criadoEm: '2026-11-21T12:00:00.000Z',
  totalPontos: 4,
  custoEstimado: 27.17,
  capaUrl: null,
  pontosVisitados: 2,
  custoRegistrado: 14,
};

describe('CartaoDoRoteiro', () => {
  it('abre o roteiro ao tocar, com uma descrição completa para o leitor de tela', () => {
    const onAbrir = jest.fn();
    renderizar(<CartaoDoRoteiro resumo={resumo} onAbrir={onAbrir} />);

    fireEvent.press(screen.getByRole('button', { name: /^Abrir o roteiro de Quixadá/ }));
    expect(onAbrir).toHaveBeenCalledTimes(1);
  });

  it('na versão curta (Início), não oferece apagar', () => {
    renderizar(<CartaoDoRoteiro resumo={resumo} onAbrir={jest.fn()} />);
    expect(screen.queryByRole('button', { name: /^Apagar/ })).toBeNull();
  });

  it('detalhado, mostra as visitas e o valor pago', () => {
    renderizar(<CartaoDoRoteiro resumo={resumo} onAbrir={jest.fn()} detalhado />);
    expect(
      screen.getByText(/2 paradas visitadas · R\$\s14,00 pagos em corridas/),
    ).toBeOnTheScreen();
  });

  it('apagar pede confirmação antes, e cancelar desiste', () => {
    const onApagar = jest.fn();
    renderizar(<CartaoDoRoteiro resumo={resumo} onAbrir={jest.fn()} onApagar={onApagar} />);

    fireEvent.press(screen.getByRole('button', { name: /^Apagar o roteiro de Quixadá/ }));
    expect(onApagar).not.toHaveBeenCalled();
    expect(screen.getByText(/Não dá para desfazer/)).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText(/Não dá para desfazer/)).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: /^Apagar o roteiro de Quixadá/ }));
    fireEvent.press(screen.getByRole('button', { name: /^Confirmar: apagar o roteiro/ }));
    expect(onApagar).toHaveBeenCalledTimes(1);
  });
});
