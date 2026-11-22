import { screen } from '@testing-library/react-native';

import { renderizar } from '@/testes/renderizar';
import { itemDeExemplo, roteiroDeExemplo } from '@/testes/roteiro-de-exemplo';
import { ResumoDoRoteiro } from '../resumo';

describe('ResumoDoRoteiro', () => {
  it('com teto, mostra o uso do orçamento numa barra que o leitor de tela entende', () => {
    renderizar(<ResumoDoRoteiro roteiro={roteiroDeExemplo()} />);

    const barra = screen.getByRole('progressbar', { name: 'Uso do orçamento' });
    expect(barra).toHaveAccessibilityValue({ min: 0, max: 100, now: 17 });
  });

  it('sem teto, explica que o valor é a média prevista, sem barra', () => {
    const base = roteiroDeExemplo();
    renderizar(
      <ResumoDoRoteiro
        roteiro={{ ...base, orcamento: null, totais: { ...base.totais, usoOrcamento: null } }}
      />,
    );

    expect(screen.getByText(/Sem teto de gasto/)).toBeOnTheScreen();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('avisa quantas paradas caem fora do horário de funcionamento', () => {
    renderizar(
      <ResumoDoRoteiro
        roteiro={roteiroDeExemplo({
          itens: [
            itemDeExemplo({ situacaoNoHorario: 'fechado' }),
            itemDeExemplo({ ordem: 2, situacaoNoHorario: 'fecha-durante-a-visita' }),
            itemDeExemplo({ ordem: 3 }),
          ],
        })}
      />,
    );

    expect(screen.getByText(/2 paradas caem fora do horário de funcionamento/)).toBeOnTheScreen();
  });
});
