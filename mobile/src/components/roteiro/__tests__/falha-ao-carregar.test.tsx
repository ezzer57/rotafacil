import { fireEvent, screen } from '@testing-library/react-native';

import { AvisoDeErro } from '@/components/ui';
import { ErroApi } from '@/data/erros';
import { renderizar } from '@/testes/renderizar';
import { FalhaAoCarregar } from '../falha-ao-carregar';

function montar(erro: unknown) {
  const acoes = { onTentarDeNovo: jest.fn(), onVoltar: jest.fn() };
  renderizar(<FalhaAoCarregar erro={erro} {...acoes} />);
  return acoes;
}

describe('FalhaAoCarregar', () => {
  it('roteiro que não existe leva de volta, sem oferecer tentar de novo', () => {
    const acoes = montar(new ErroApi(404, 'Roteiro não encontrado', 'NAO_ENCONTRADO'));

    expect(screen.getByText('Roteiro não encontrado')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Voltar ao início' }));
    expect(acoes.onVoltar).toHaveBeenCalledTimes(1);
  });

  it('sem conexão, diz isso e deixa tentar de novo', () => {
    const acoes = montar(new ErroApi(0, 'Sem conexão com o servidor', 'SEM_REDE'));

    expect(screen.getByText('Sem conexão')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(acoes.onTentarDeNovo).toHaveBeenCalledTimes(1);
  });

  it('outra falha mostra a mensagem da API', () => {
    montar(new ErroApi(500, 'Erro interno no servidor', 'INTERNO'));
    expect(screen.getByText('Erro interno no servidor')).toBeOnTheScreen();
  });
});

describe('AvisoDeErro', () => {
  it('anuncia a falha e pode ser dispensado', () => {
    const onFechar = jest.fn();
    renderizar(<AvisoDeErro mensagem="Não foi possível trocar o ponto" onFechar={onFechar} />);

    expect(screen.getByRole('alert')).toHaveTextContent(/Não foi possível trocar o ponto/);
    fireEvent.press(screen.getByRole('button', { name: 'Dispensar o aviso' }));
    expect(onFechar).toHaveBeenCalledTimes(1);
  });
});
