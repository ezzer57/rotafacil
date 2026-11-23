/**
 * Página do mapa do ponto de partida.
 *
 * Mostra onde o GPS diz que o usuário está, com o círculo da margem de erro,
 * e o ponto de onde o roteiro vai partir. Um toque no mapa move o ponto de
 * partida e avisa o aplicativo.
 *
 * Como no mapa do roteiro, o mesmo HTML serve ao WebView do celular e ao
 * iframe do navegador, sobre a base de pagina.ts.
 */

import { corSegura, paginaDoMapa } from './pagina';

interface OpcoesMapaPartida {
  posicao: { lat: number; lng: number } | null;
  precisaoM: number | null;
  partida: { lat: number; lng: number };
  corPrimaria: string;
  corSucesso: string;
  corFundo: string;
  escuro: boolean;
}

export function construirHtmlMapaPartida({
  posicao,
  precisaoM,
  partida,
  corPrimaria,
  corSucesso,
  corFundo,
  escuro,
}: OpcoesMapaPartida): string {
  const primaria = corSegura(corPrimaria);
  const sucesso = corSegura(corSucesso);

  return paginaDoMapa({
    corFundo,
    escuro,
    dados: { posicao, precisaoM, partida, cores: { primaria } },
    estilos: `
  .voce {
    width: 14px; height: 14px; border-radius: 999px;
    background: ${primaria}; border: 3px solid #fff;
    box-shadow: 0 0 0 2px ${primaria}55, 0 2px 6px rgba(0,0,0,.35);
  }
  .partida {
    width: 18px; height: 18px; border-radius: 999px;
    background: #fff; border: 5px solid ${sucesso};
    box-shadow: 0 2px 6px rgba(0,0,0,.4);
  }`,
    script: `
  var icone = function (classe, lado) {
    return L.divIcon({ className: '', html: '<div class="' + classe + '"></div>', iconSize: [lado, lado], iconAnchor: [lado / 2, lado / 2] });
  };

  if (dados.posicao) {
    var aqui = [dados.posicao.lat, dados.posicao.lng];
    if (dados.precisaoM) {
      L.circle(aqui, { radius: dados.precisaoM, color: dados.cores.primaria, weight: 1, fillOpacity: 0.12 }).addTo(mapa);
    }
    // Fica por cima do ponto de partida: quando os dois coincidem, aparece
    // o ponto azul dentro do anel verde.
    L.marker(aqui, { icon: icone('voce', 20), interactive: false, zIndexOffset: 300 }).addTo(mapa);
  }

  var inicio = [dados.partida.lat, dados.partida.lng];
  var marcador = L.marker(inicio, { icon: icone('partida', 28), interactive: false, zIndexOffset: 200 }).addTo(mapa);

  // Mostra a posição e a partida juntas quando estão longe uma da outra.
  if (dados.posicao && mapa.distance(aqui, inicio) > 400) {
    mapa.fitBounds(L.latLngBounds([aqui, inicio]), { padding: [36, 36], maxZoom: 16 });
  } else {
    mapa.setView(inicio, dados.precisaoM && dados.precisaoM > 300 ? 14 : 16);
  }

  mapa.on('click', function (evento) {
    marcador.setLatLng(evento.latlng);
    var ponto = { lat: evento.latlng.lat, lng: evento.latlng.lng };
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(ponto));                         // celular
    } else if (window.parent) {
      window.parent.postMessage({ tipo: 'partida', lat: ponto.lat, lng: ponto.lng }, '*'); // navegador
    }
  });`,
  });
}
