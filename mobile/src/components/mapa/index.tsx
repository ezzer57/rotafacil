/**
 * Mapa do roteiro - versão para Android e iOS.
 *
 * Desenha o percurso com Leaflet dentro de um WebView. Essa escolha permite
 * ter mapa de verdade sem chave de API e sem compilação nativa, ou seja,
 * funcionando no Expo Go durante a fase de protótipo.
 *
 * A versão para navegador está em index.web.tsx; o Metro escolhe o arquivo
 * conforme a plataforma.
 */

import { useMemo } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { useTema } from '@/theme/provider';
import { raio } from '@/theme/tokens';
import { construirHtmlMapa } from './html';
import type { MapaRoteiroProps } from './tipos';

export default function MapaRoteiro({
  origem,
  paradas,
  altura = 220,
  onSelecionarParada,
}: MapaRoteiroProps) {
  const { cores, escuro } = useTema();

  const html = useMemo(
    () =>
      construirHtmlMapa({
        origem,
        paradas,
        corPrimaria: cores.primaria,
        corSucesso: cores.sucesso,
        corFundo: cores.fundoAlt,
        escuro,
      }),
    [origem, paradas, cores, escuro],
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
        onMessage={(evento) => onSelecionarParada?.(evento.nativeEvent.data)}
      />
    </View>
  );
}

export type { MapaRoteiroProps, ParadaMapa } from './tipos';
