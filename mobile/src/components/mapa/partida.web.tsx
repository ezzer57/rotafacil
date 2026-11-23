/**
 * Mapa do ponto de partida - versão para navegador.
 *
 * Usa o mesmo HTML da versão do celular, dentro de um iframe isolado
 * (sandbox): o mapa roda sem acesso ao armazenamento do app, onde fica o
 * token da sessão. Só valem as mensagens que vêm desse iframe.
 */

import { useEffect, useMemo, useRef } from 'react';
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
  const quadro = useRef<HTMLIFrameElement>(null);

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
      if (evento.source !== quadro.current?.contentWindow) return;
      const dado = evento.data;
      if (
        dado?.tipo === 'partida' &&
        typeof dado.lat === 'number' &&
        typeof dado.lng === 'number'
      ) {
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
        ref={quadro}
        title="Mapa do ponto de partida"
        sandbox="allow-scripts"
        srcDoc={html}
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </View>
  );
}
