/**
 * Contrato do componente de mapa.
 *
 * As telas conversam apenas com estes tipos. Hoje o mapa é desenhado com
 * Leaflet e tiles do OpenStreetMap; quando o projeto passar para o mapa
 * nativo do Google (react-native-maps), só as implementações mudam, e os
 * tipos daqui continuam os mesmos.
 */

import type { Modal } from '@/domain/types';

export interface ParadaMapa {
  id: string;
  nome: string;
  ordem: number;
  lat: number;
  lng: number;
  /** Modal usado para chegar nesta parada. Ausente na primeira. */
  modalAteAqui: Modal | null;
  /** Ruas do trecho até esta parada, como [lat, lng]; sem ele, linha reta. */
  trajetoAteAqui?: [number, number][] | null;
  /**
   * De onde saiu o trecho até esta parada, quando não foi da anterior: no
   * "Recalcular daqui", a posição da pessoa. Vira um marcador no mapa.
   */
  partidaAteAqui?: { lat: number; lng: number } | null;
  /**
   * O usuário já fez check-in aqui ("Cheguei"): o trecho até esta parada sai
   * do mapa, e o marcador vira um visto.
   */
  visitada?: boolean;
}

export interface MapaPartidaProps {
  /** Onde o GPS diz que o usuário está, quando há leitura. */
  posicao?: { lat: number; lng: number } | null;
  /** Margem de erro do GPS, em metros: vira um círculo em volta da posição. */
  precisaoM?: number | null;
  /** Ponto de onde o roteiro vai partir. */
  partida: { lat: number; lng: number };
  altura?: number;
  /** Chamado quando o usuário toca no mapa para mudar o ponto de partida. */
  onEscolher: (ponto: { lat: number; lng: number }) => void;
}

export interface MapaRoteiroProps {
  /** Posição de partida do usuário. */
  origem?: { lat: number; lng: number } | null;
  paradas: ParadaMapa[];
  /** Em pixels, ou "preencher" para ocupar todo o espaço do contêiner. */
  altura?: number | 'preencher';
  onSelecionarParada?: (id: string) => void;
}
