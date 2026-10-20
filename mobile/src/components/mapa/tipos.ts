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
}

export interface MapaRoteiroProps {
  /** Posição de partida do usuário. */
  origem?: { lat: number; lng: number } | null;
  paradas: ParadaMapa[];
  altura?: number;
  onSelecionarParada?: (id: string) => void;
}
