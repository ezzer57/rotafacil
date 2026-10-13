/**
 * Dados simulados para a construção da interface.
 *
 * ATENÇÃO: conteúdo provisório, usado apenas enquanto o backend nao existe.
 * Os pontos turísticos são reais, mas notas, avaliações, horários e os
 * estabelecimentos de gastronomia são fictícios. As fotos vêm de um serviço
 * de imagens aleatórias; no produto final virão da Places API.
 *
 * As tarifas de táxi são PROVISÓRIAS e precisam ser substituídas pelos
 * valores do decreto municipal de cada cidade (Quadro Z do TCC).
 */

import type { Cidade, PontoInteresse } from '@/domain/types';

export interface TarifaTaxi {
  cidadeId: string;
  bandeirada: number;
  kmBandeira1: number;
  kmBandeira2: number;
  horaParada: number;
  /** Fator de calibração para transporte por aplicativo (seccao 3.7.4). */
  alfa: number;
  alfaP10: number;
  alfaP90: number;
  norma: string;
}

export const CIDADES: Cidade[] = [
  {
    id: 'quixada',
    nome: 'Quixadá',
    uf: 'CE',
    pais: 'Brasil',
    bandeira: '🇧🇷',
    centro: { lat: -4.9712, lng: -39.0156 },
    tarifaCalibrada: true,
  },
  {
    id: 'fortaleza',
    nome: 'Fortaleza',
    uf: 'CE',
    pais: 'Brasil',
    bandeira: '🇧🇷',
    centro: { lat: -3.7319, lng: -38.5267 },
    tarifaCalibrada: true,
  },
];

export const TARIFAS: Record<string, TarifaTaxi> = {
  quixada: {
    cidadeId: 'quixada',
    bandeirada: 5.0,
    kmBandeira1: 3.0,
    kmBandeira2: 3.6,
    horaParada: 28.0,
    alfa: 0.85,
    alfaP10: 0.72,
    alfaP90: 1.05,
    norma: 'Valor provisório - confirmar decreto municipal',
  },
  fortaleza: {
    cidadeId: 'fortaleza',
    bandeirada: 5.5,
    kmBandeira1: 3.2,
    kmBandeira2: 3.9,
    horaParada: 30.0,
    alfa: 0.82,
    alfaP10: 0.68,
    alfaP90: 1.1,
    norma: 'Valor provisório - confirmar decreto municipal',
  },
};

const foto = (slug: string) => `https://picsum.photos/seed/${slug}/800/600`;

export const PONTOS: PontoInteresse[] = [
  // ---------------------------------------------------------------- Quixada
  {
    id: 'qx-galinha-choca',
    nome: 'Pedra da Galinha Choca',
    categoria: 'natureza',
    endereco: 'Serra do Estevão, Quixadá - CE',
    coordenada: { lat: -4.9339, lng: -39.0131 },
    nota: 4.8,
    avaliacoes: 1240,
    faixaPreco: null,
    fotoUrl: foto('galinha-choca'),
    tempoVisitaMin: 45,
    abertoAgora: true,
    horarioHoje: 'Aberto 24 horas',
  },
  {
    id: 'qx-acude-cedro',
    nome: 'Açude do Cedro',
    categoria: 'natureza',
    endereco: 'Zona rural, Quixadá - CE',
    coordenada: { lat: -4.9494, lng: -39.0247 },
    nota: 4.6,
    avaliacoes: 870,
    faixaPreco: null,
    fotoUrl: foto('acude-cedro'),
    tempoVisitaMin: 60,
    abertoAgora: true,
    horarioHoje: '08:00 às 17:00',
  },
  {
    id: 'qx-monolitos',
    nome: 'Mirante dos Monólitos',
    categoria: 'natureza',
    endereco: 'Quixadá - CE',
    coordenada: { lat: -4.943, lng: -39.009 },
    nota: 4.7,
    avaliacoes: 530,
    faixaPreco: null,
    fotoUrl: foto('monolitos'),
    tempoVisitaMin: 30,
    abertoAgora: true,
    horarioHoje: '06:00 às 18:00',
  },
  {
    id: 'qx-igreja-matriz',
    nome: 'Igreja Matriz de Santo Antônio',
    categoria: 'religioso',
    endereco: 'Centro, Quixadá - CE',
    coordenada: { lat: -4.9707, lng: -39.0151 },
    nota: 4.5,
    avaliacoes: 410,
    faixaPreco: null,
    fotoUrl: foto('igreja-matriz'),
    tempoVisitaMin: 20,
    abertoAgora: true,
    horarioHoje: '07:00 às 19:00',
  },
  {
    id: 'qx-restaurante-sertao',
    nome: 'Restaurante Sabor do Sertão',
    categoria: 'gastronomia',
    endereco: 'Centro, Quixadá - CE',
    coordenada: { lat: -4.9725, lng: -39.0168 },
    nota: 4.4,
    avaliacoes: 320,
    faixaPreco: 2,
    fotoUrl: foto('sabor-sertao'),
    tempoVisitaMin: 60,
    abertoAgora: true,
    horarioHoje: '11:00 às 15:00',
  },
  {
    id: 'qx-cafe-pedra',
    nome: 'Café da Pedra',
    categoria: 'gastronomia',
    endereco: 'Av. Plínio Pompeu, Quixadá - CE',
    coordenada: { lat: -4.9681, lng: -39.0132 },
    nota: 4.6,
    avaliacoes: 180,
    faixaPreco: 1,
    fotoUrl: foto('cafe-pedra'),
    tempoVisitaMin: 30,
    abertoAgora: true,
    horarioHoje: '08:00 às 22:00',
  },
  {
    id: 'qx-centro-cultural',
    nome: 'Centro Cultural de Quixadá',
    categoria: 'cultura',
    endereco: 'Centro, Quixadá - CE',
    coordenada: { lat: -4.9718, lng: -39.0174 },
    nota: 4.3,
    avaliacoes: 150,
    faixaPreco: null,
    fotoUrl: foto('centro-cultural-qx'),
    tempoVisitaMin: 45,
    abertoAgora: true,
    horarioHoje: '08:00 às 17:00',
  },

  // -------------------------------------------------------------- Fortaleza
  {
    id: 'fz-mercado-central',
    nome: 'Mercado Central',
    categoria: 'compras',
    endereco: 'Centro, Fortaleza - CE',
    coordenada: { lat: -3.7247, lng: -38.5312 },
    nota: 4.5,
    avaliacoes: 48200,
    faixaPreco: 2,
    fotoUrl: foto('mercado-central'),
    tempoVisitaMin: 60,
    abertoAgora: true,
    horarioHoje: '08:00 às 18:00',
  },
  {
    id: 'fz-dragao-do-mar',
    nome: 'Centro Dragão do Mar',
    categoria: 'cultura',
    endereco: 'Praia de Iracema, Fortaleza - CE',
    coordenada: { lat: -3.7221, lng: -38.5243 },
    nota: 4.7,
    avaliacoes: 32100,
    faixaPreco: null,
    fotoUrl: foto('dragao-do-mar'),
    tempoVisitaMin: 90,
    abertoAgora: true,
    horarioHoje: '09:00 às 21:00',
  },
  {
    id: 'fz-praia-iracema',
    nome: 'Praia de Iracema',
    categoria: 'natureza',
    endereco: 'Praia de Iracema, Fortaleza - CE',
    coordenada: { lat: -3.7206, lng: -38.5131 },
    nota: 4.4,
    avaliacoes: 21500,
    faixaPreco: null,
    fotoUrl: foto('praia-iracema'),
    tempoVisitaMin: 60,
    abertoAgora: true,
    horarioHoje: 'Aberto 24 horas',
  },
  {
    id: 'fz-catedral',
    nome: 'Catedral Metropolitana',
    categoria: 'religioso',
    endereco: 'Centro, Fortaleza - CE',
    coordenada: { lat: -3.7256, lng: -38.5296 },
    nota: 4.6,
    avaliacoes: 12800,
    faixaPreco: null,
    fotoUrl: foto('catedral-fortaleza'),
    tempoVisitaMin: 30,
    abertoAgora: true,
    horarioHoje: '07:00 às 18:00',
  },
  {
    id: 'fz-theatro-jose-alencar',
    nome: 'Theatro José de Alencar',
    categoria: 'cultura',
    endereco: 'Centro, Fortaleza - CE',
    coordenada: { lat: -3.7293, lng: -38.525 },
    nota: 4.7,
    avaliacoes: 9400,
    faixaPreco: null,
    fotoUrl: foto('theatro-jose-alencar'),
    tempoVisitaMin: 60,
    abertoAgora: true,
    horarioHoje: '08:00 às 17:00',
  },
  {
    id: 'fz-parque-coco',
    nome: 'Parque do Cocó',
    categoria: 'natureza',
    endereco: 'Cocó, Fortaleza - CE',
    coordenada: { lat: -3.7586, lng: -38.4866 },
    nota: 4.6,
    avaliacoes: 15600,
    faixaPreco: null,
    fotoUrl: foto('parque-do-coco'),
    tempoVisitaMin: 75,
    abertoAgora: true,
    horarioHoje: '06:00 às 17:00',
  },
  {
    id: 'fz-restaurante-maresia',
    nome: 'Restaurante Maresia',
    categoria: 'gastronomia',
    endereco: 'Praia do Futuro, Fortaleza - CE',
    coordenada: { lat: -3.7417, lng: -38.454 },
    nota: 4.5,
    avaliacoes: 5200,
    faixaPreco: 3,
    fotoUrl: foto('restaurante-maresia'),
    tempoVisitaMin: 75,
    abertoAgora: true,
    horarioHoje: '11:00 às 23:00',
  },
  {
    id: 'fz-feirinha-beira-mar',
    nome: 'Feirinha da Beira-Mar',
    categoria: 'compras',
    endereco: 'Meireles, Fortaleza - CE',
    coordenada: { lat: -3.7256, lng: -38.4958 },
    nota: 4.3,
    avaliacoes: 18900,
    faixaPreco: 2,
    fotoUrl: foto('feirinha-beira-mar'),
    tempoVisitaMin: 45,
    abertoAgora: true,
    horarioHoje: '16:00 às 23:00',
  },
];

export const pontosPorCidade = (cidadeId: string) =>
  PONTOS.filter((p) => p.id.startsWith(cidadeId === 'quixada' ? 'qx-' : 'fz-'));
