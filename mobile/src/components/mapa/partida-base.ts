/**
 * Lógica comum às duas versões do mapa do ponto de partida.
 *
 * O HTML do mapa só é refeito quando a partida muda por fora (o usuário
 * escolheu "minha posição" ou "centro", ou trocou de cidade). Quando a
 * mudança veio de um toque no próprio mapa, a página já moveu o marcador, e
 * refazer o HTML recarregaria o mapa inteiro a cada toque.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface Ponto {
  lat: number;
  lng: number;
}

export function useBaseDoMapa(partida: Ponto, onEscolher: (ponto: Ponto) => void) {
  const [base, setBase] = useState(partida);
  const ultimoToque = useRef<Ponto | null>(null);
  const { lat, lng } = partida;

  useEffect(() => {
    const toque = ultimoToque.current;
    if (toque && toque.lat === lat && toque.lng === lng) return;
    setBase({ lat, lng });
  }, [lat, lng]);

  const aoTocar = useCallback(
    (ponto: Ponto) => {
      ultimoToque.current = ponto;
      onEscolher(ponto);
    },
    [onEscolher],
  );

  return { base, aoTocar };
}
