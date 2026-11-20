/**
 * Mapa do ponto de partida - versão para Android e iOS.
 *
 * Mostra a posição do GPS com a margem de erro e deixa o usuário corrigir o
 * ponto de partida com um toque. A versão para navegador está em
 * partida.web.tsx; o Metro escolhe o arquivo conforme a plataforma.
 */

import { useMemo } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

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
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        // Dentro de uma tela que rola, o gesto de arrastar fica com o mapa.
        nestedScrollEnabled
        onMessage={(evento) => {
          try {
            const ponto = JSON.parse(evento.nativeEvent.data) as { lat?: unknown; lng?: unknown };
            if (typeof ponto.lat === 'number' && typeof ponto.lng === 'number') {
              aoTocar({ lat: ponto.lat, lng: ponto.lng });
            }
          } catch {
            // Mensagem que não é do mapa: ignora.
          }
        }}
      />
    </View>
  );
}
