/**
 * Horário de início do roteiro.
 *
 * A tela oferece "agora" e algumas horas do dia. Uma hora que já passou hoje
 * vale para amanhã: às 16h, "09:00" quer dizer amanhã de manhã. Montar o
 * roteiro para as 9h de hoje usaria horários de funcionamento e bandeira de
 * um momento que já passou.
 */

import { bandeiraDe } from '@motor/tarifa';

export interface OpcaoDeInicio {
  rotulo: string;
  /** Hora do dia (9, 14, 22.5); null é "agora". */
  hora: number | null;
}

export const HORARIOS_DE_INICIO: OpcaoDeInicio[] = [
  { rotulo: 'Agora', hora: null },
  { rotulo: '09:00', hora: 9 },
  { rotulo: '14:00', hora: 14 },
  { rotulo: '22:30', hora: 22.5 },
];

/**
 * Quem escolhe "09:00" às 9h10 ainda quer sair hoje: só depois desta folga a
 * hora passa para amanhã.
 */
const FOLGA_MIN = 30;

export function inicioPrevisto(hora: number | null, agora: Date = new Date()): Date {
  const data = new Date(agora);
  if (hora == null) return data;

  data.setHours(Math.floor(hora), Math.round((hora % 1) * 60), 0, 0);
  if (agora.getTime() - data.getTime() > FOLGA_MIN * 60_000) {
    data.setDate(data.getDate() + 1);
  }
  return data;
}

/** O início cai noutro dia que não hoje. */
export const ehOutroDia = (inicio: Date, agora: Date = new Date()) =>
  inicio.toDateString() !== agora.toDateString();

/** Bandeira 2 do táxi (noite e domingo), pela mesma regra do motor. */
export const emBandeira2 = (inicio: Date) => bandeiraDe(inicio) === 2;
