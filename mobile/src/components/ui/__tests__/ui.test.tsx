import { fireEvent, screen, userEvent } from '@testing-library/react-native';

import { ErroApi } from '@/data/erros';
import { renderizar } from '@/testes/renderizar';
import { Texto } from '../texto';
import { Botao, Campo, Cartao, Chip, ErroAoCarregar, GrupoDeOpcoes } from '..';

describe('Botao', () => {
  it('é um botão para o leitor de tela, com a descrição que se pedir', () => {
    const onPress = jest.fn();
    renderizar(<Botao titulo="Trocar" rotuloAcessivel="Trocar o Museu" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Trocar o Museu' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('desabilitado ou carregando, não responde ao toque', async () => {
    const onPress = jest.fn();
    renderizar(<Botao titulo="Gerar roteiro" desabilitado onPress={onPress} />);

    const botao = screen.getByRole('button', { name: 'Gerar roteiro' });
    expect(botao).toBeDisabled();
    await userEvent.setup().press(botao);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Chip e GrupoDeOpcoes', () => {
  it('escolha única: a opção marcada aparece marcada', () => {
    renderizar(
      <GrupoDeOpcoes rotulo="Tempo disponível">
        <Chip rotulo="2h" ativo onPress={jest.fn()} />
        <Chip rotulo="4h" onPress={jest.fn()} />
      </GrupoDeOpcoes>,
    );

    // O grupo (radiogroup) não entra nas consultas: para não esconder as opções
    // do leitor de tela do iPhone, ele não é um elemento acessível à parte.
    expect(screen.getByRole('radio', { name: '2h' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '4h' })).not.toBeChecked();
  });

  it('escolha múltipla: caixas de marcação', () => {
    renderizar(<Chip rotulo="Cultura" selecao="multipla" ativo onPress={jest.fn()} />);
    expect(screen.getByRole('checkbox', { name: 'Cultura' })).toBeChecked();
  });

  it('sem ação, é só um indicador, e não um controle', () => {
    renderizar(<Chip rotulo="Ponto no mapa" ativo />);
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});

describe('Cartao', () => {
  it('cartão tocável vira botão com descrição', () => {
    const onPress = jest.fn();
    renderizar(
      <Cartao onPress={onPress} rotuloAcessivel="Abrir o roteiro de Quixadá">
        <Texto>Quixadá</Texto>
      </Cartao>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Abrir o roteiro de Quixadá' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('Campo', () => {
  it('o rótulo é o nome do campo, e o erro é anunciado como alerta', () => {
    renderizar(<Campo rotulo="E-mail" value="" erro="E-mail inválido" />);

    expect(screen.getByLabelText('E-mail')).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toHaveTextContent('E-mail inválido');
  });
});

describe('ErroAoCarregar', () => {
  it('sem conexão, diz isso e oferece tentar de novo', () => {
    const onTentarDeNovo = jest.fn();
    renderizar(
      <ErroAoCarregar
        erro={new ErroApi(0, 'Sem conexão com o servidor', 'SEM_REDE')}
        onTentarDeNovo={onTentarDeNovo}
      />,
    );

    expect(screen.getByText('Sem conexão')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(onTentarDeNovo).toHaveBeenCalledTimes(1);
  });

  it('outra falha mostra o título da tela e a mensagem da API', () => {
    renderizar(
      <ErroAoCarregar
        erro={new ErroApi(500, 'Erro interno no servidor')}
        titulo="Não foi possível carregar as viagens"
        onTentarDeNovo={jest.fn()}
      />,
    );

    expect(screen.getByText('Não foi possível carregar as viagens')).toBeOnTheScreen();
    expect(screen.getByText('Erro interno no servidor')).toBeOnTheScreen();
  });
});
