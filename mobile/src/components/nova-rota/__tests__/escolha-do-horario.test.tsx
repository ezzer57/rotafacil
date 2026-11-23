import { fireEvent, screen } from '@testing-library/react-native';

import { renderizar } from '@/testes/renderizar';
import { EscolhaDoHorario } from '../escolha-do-horario';

// Quarta-feira, 25 de novembro de 2026, às 16h (fuso de Quixadá).
const QUARTA_16H = new Date(2026, 10, 25, 16, 0);

describe('EscolhaDoHorario', () => {
  it('hora que já passou aparece como de amanhã', () => {
    renderizar(<EscolhaDoHorario hora={null} onEscolher={jest.fn()} agora={QUARTA_16H} />);

    expect(screen.getByRole('radio', { name: 'Amanhã, 09:00' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Amanhã, 14:00' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: '22:30' })).toBeOnTheScreen();
  });

  it('marca a opção escolhida e avisa da bandeira 2 à noite', () => {
    const onEscolher = jest.fn();
    renderizar(<EscolhaDoHorario hora={22.5} onEscolher={onEscolher} agora={QUARTA_16H} />);

    expect(screen.getByRole('radio', { name: '22:30' })).toBeChecked();
    expect(screen.getByText('Horário de bandeira 2')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('radio', { name: 'Agora' }));
    expect(onEscolher).toHaveBeenCalledWith(null);
  });

  it('de dia útil à tarde não há aviso de bandeira 2', () => {
    renderizar(<EscolhaDoHorario hora={null} onEscolher={jest.fn()} agora={QUARTA_16H} />);
    expect(screen.queryByText('Horário de bandeira 2')).toBeNull();
  });
});
