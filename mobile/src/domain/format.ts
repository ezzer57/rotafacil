/**
 * Formatadores de apresentação. Ficam no domínio (e não nas telas) para que
 * o mesmo valor seja exibido do mesmo jeito em todo o aplicativo.
 */

import type { CategoriaPOI, FaixaCusto, Modal, MotivoDescarte, Reais } from './types';

export function formatarReais(valor: Reais): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

/** Ex.: "R$ 12,40 a R$ 18,90" */
export function formatarFaixa(faixa: FaixaCusto): string {
  if (faixa.max <= 0) return 'Gratuito';
  return `${formatarReais(faixa.min)} a ${formatarReais(faixa.max)}`;
}

/** Ex.: 95 -> "1h35"; 45 -> "45 min" */
export function formatarDuracao(minutos: number): string {
  const min = Math.max(0, Math.round(minutos));
  const horas = Math.floor(min / 60);
  const resto = min % 60;
  if (horas === 0) return `${resto} min`;
  if (resto === 0) return `${horas}h`;
  return `${horas}h${String(resto).padStart(2, '0')}`;
}

export function formatarDistancia(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

/** Ex.: "09:30" a partir de uma data ISO. */
export function formatarHora(iso: string): string {
  const data = new Date(iso);
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatarDataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export const rotuloCategoria: Record<CategoriaPOI, string> = {
  cultura: 'Cultura',
  natureza: 'Natureza',
  gastronomia: 'Gastronomia',
  compras: 'Compras',
  vidaNoturna: 'Vida noturna',
  religioso: 'Religioso',
};

export const iconeCategoria: Record<CategoriaPOI, string> = {
  cultura: 'color-palette',
  natureza: 'leaf',
  gastronomia: 'restaurant',
  compras: 'bag-handle',
  vidaNoturna: 'moon',
  religioso: 'business',
};

export const rotuloModal: Record<Modal, string> = {
  pe: 'A pé',
  app: 'Transporte por app',
};

export const rotuloMotivoDescarte: Record<MotivoDescarte, string> = {
  orcamento: 'Orçamento',
  tempo: 'Tempo',
  horario: 'Horário',
};
