/**
 * Mapa do ponto de partida - versão para navegador.
 *
 * Usa o mesmo HTML da versão do celular, dentro de um iframe.
 */

import { useEffect, useMemo } from 'react';
import { View } from 'react-native';

import { useTema } from '@/theme/provider';
import { raio } from '@/theme/tokens';
import { construirHtmlMapaPartida } from './html-partida';
import { useBaseDoMapa } from './partida-base';
import type { MapaPartidaProps } from './tipos';

export default function MapaPartida({
  posicao,
  precisaoM,
  partida,
  altura = 220,
  onEscolher,
}: MapaPartidaProps) {
  const { cores, escuro } = useTema();
  const { base, aoTocar } = useBaseDoMapa(partida, onEscolher);

  const html = useMemo(
    () =>
      construirHtmlMapaPartida({
        posicao: posicao ?? null,
        precisaoM: precisaoM ?? null,
        partida: base,
        corPrimaria: cores.primaria,
        corSucesso: cores.sucesso,
        corFundo: cores.fundoAlt,
        escuro,
      }),
    [posicao, precisaoM, base, cores, escuro],
  );

  // O toque no mapa chega como mensagem vinda do iframe.
  useEffect(() => {
    function aoReceber(evento: MessageEvent) {
      const dado = evento.data;
      if (dado?.tipo === 'partida' && typeof dado.lat === 'number' && typeof dado.lng === 'number') {
        aoTocar({ lat: dado.lat, lng: dado.lng });
      }
    }
    window.addEventListener('message', aoReceber);
    return () => window.removeEventListener('message', aoReceber);
  }, [aoTocar]);

  return (
    <View
      style={{
        height: altura,
        borderRadius: raio.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: cores.borda,
        backgroundColor: cores.fundoAlt,
      }}>
      <iframe
        title="Mapa do ponto de partida"
        srcDoc={html}
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </View>
  );
}
