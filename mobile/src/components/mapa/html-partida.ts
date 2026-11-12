/**
 * Monta a página do mapa do ponto de partida.
 *
 * Mostra onde o GPS diz que o usuário está, com o círculo da margem de erro,
 * e o ponto de onde o roteiro vai partir. Um toque no mapa move o ponto de
 * partida e avisa o aplicativo.
 *
 * Como no mapa do roteiro, o mesmo HTML serve ao WebView do celular e ao
 * iframe do navegador.
 */

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
  const dados = JSON.stringify({ posicao, precisaoM, partida });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #mapa { height: 100%; margin: 0; padding: 0; background: ${corFundo}; }
  .leaflet-container { background: ${corFundo}; font-family: -apple-system, system-ui, sans-serif; }
  .escuro .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.92); }
  .voce {
    width: 14px; height: 14px; border-radius: 999px;
    background: ${corPrimaria}; border: 3px solid #fff;
    box-shadow: 0 0 0 2px ${corPrimaria}55, 0 2px 6px rgba(0,0,0,.35);
  }
  .partida {
    width: 18px; height: 18px; border-radius: 999px;
    background: #fff; border: 5px solid ${corSucesso};
    box-shadow: 0 2px 6px rgba(0,0,0,.4);
  }
  .leaflet-control-attribution { font-size: 9px; opacity: .8; }
</style>
</head>
<body class="${escuro ? 'escuro' : ''}">
<div id="mapa"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var dados = ${dados};

  var mapa = L.map('mapa', { zoomControl: false, attributionControl: false });
  L.control.zoom({ position: 'bottomright' }).addTo(mapa);
  // Crédito em texto, sem link: dentro do WebView um link trocaria o mapa
  // pela página de destino, sem botão de voltar.
  L.control.attribution({ prefix: false }).addTo(mapa);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapa);

  var icone = function (classe, lado) {
    return L.divIcon({ className: '', html: '<div class="' + classe + '"></div>', iconSize: [lado, lado], iconAnchor: [lado / 2, lado / 2] });
  };

  if (dados.posicao) {
    var aqui = [dados.posicao.lat, dados.posicao.lng];
    if (dados.precisaoM) {
      L.circle(aqui, { radius: dados.precisaoM, color: '${corPrimaria}', weight: 1, fillOpacity: 0.12 }).addTo(mapa);
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
      window.ReactNativeWebView.postMessage(JSON.stringify(ponto));              // celular
    } else if (window.parent) {
      window.parent.postMessage({ tipo: 'partida', lat: ponto.lat, lng: ponto.lng }, '*'); // navegador
    }
  });
</script>
</body>
</html>`;
}
