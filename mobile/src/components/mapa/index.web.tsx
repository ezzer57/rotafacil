/**
 * Mapa do roteiro - versão para navegador.
 *
 * Usa o mesmo HTML da versão do celular, só que dentro de um iframe, o que
 * mantém o desenho idêntico nas duas plataformas.
 */

import { useEffect, useMemo } from 'react';
import { View } from 'react-native';

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

  // O clique no marcador chega como mensagem vinda do iframe.
  useEffect(() => {
    if (!onSelecionarParada) return;
    function aoReceber(evento: MessageEvent) {
      if (evento.data?.tipo === 'parada') onSelecionarParada?.(String(evento.data.id));
    }
    window.addEventListener('message', aoReceber);
    return () => window.removeEventListener('message', aoReceber);
  }, [onSelecionarParada]);

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
        title="Mapa do roteiro"
        srcDoc={html}
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </View>
  );
}

export type { MapaRoteiroProps, ParadaMapa } from './tipos';
