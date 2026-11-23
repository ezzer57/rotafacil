/**
 * Mapa do roteiro - versão para navegador.
 *
 * Usa o mesmo HTML da versão do celular, só que dentro de um iframe, o que
 * mantém o desenho idêntico nas duas plataformas. O iframe é isolado
 * (sandbox): o mapa roda sem acesso ao armazenamento do app, onde fica o
 * token da sessão. Só valem as mensagens que vêm desse iframe.
 */

import { useEffect, useMemo, useRef } from 'react';
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
  const quadro = useRef<HTMLIFrameElement>(null);

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
      if (evento.source !== quadro.current?.contentWindow) return;
      if (evento.data?.tipo === 'parada') onSelecionarParada?.(String(evento.data.id));
    }
    window.addEventListener('message', aoReceber);
    return () => window.removeEventListener('message', aoReceber);
  }, [onSelecionarParada]);

  return (
    <View
      style={{
        ...(altura === 'preencher' ? { flex: 1 } : { height: altura }),
        borderRadius: raio.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: cores.borda,
        backgroundColor: cores.fundoAlt,
      }}>
      <iframe
        ref={quadro}
        title="Mapa do roteiro"
        sandbox="allow-scripts"
        srcDoc={html}
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </View>
  );
}

export type { MapaRoteiroProps, ParadaMapa } from './tipos';
