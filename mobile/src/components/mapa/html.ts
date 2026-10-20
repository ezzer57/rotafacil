/**
 * Monta a página do mapa.
 *
 * O mesmo HTML é usado nas duas plataformas: dentro de um WebView no
 * celular e de um iframe no navegador. Isso garante que o mapa apareça
 * igual nos dois lugares e mantém um único lugar para mexer no desenho.
 *
 * Usa Leaflet com tiles do OpenStreetMap, que não exige chave de API. Para
 * uso além de protótipo, a política de uso do OSM pede servidor próprio ou
 * um provedor de tiles contratado.
 */

import type { ParadaMapa } from './tipos';

interface OpcoesMapa {
  origem?: { lat: number; lng: number } | null;
  paradas: ParadaMapa[];
  corPrimaria: string;
  corSucesso: string;
  corFundo: string;
  escuro: boolean;
}

export function construirHtmlMapa({
  origem,
  paradas,
  corPrimaria,
  corSucesso,
  corFundo,
  escuro,
}: OpcoesMapa): string {
  const dados = JSON.stringify({ origem: origem ?? null, paradas });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #mapa { height: 100%; margin: 0; padding: 0; background: ${corFundo}; }
  .leaflet-container { background: ${corFundo}; font-family: -apple-system, system-ui, sans-serif; }
  /* No tema escuro, inverte os tiles para não ofuscar o usuário à noite. */
  .escuro .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.92); }
  .marcador {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 999px;
    background: ${corPrimaria}; color: #fff;
    font-size: 13px; font-weight: 700;
    border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.35);
  }
  .marcador-origem {
    width: 14px; height: 14px; border-radius: 999px;
    background: #fff; border: 4px solid ${corSucesso};
    box-shadow: 0 2px 6px rgba(0,0,0,.35);
  }
  .leaflet-control-attribution { font-size: 9px; opacity: .8; }
</style>
</head>
<body class="${escuro ? 'escuro' : ''}">
<div id="mapa"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var dados = ${dados};

  var mapa = L.map('mapa', { zoomControl: false, attributionControl: true });
  L.control.zoom({ position: 'bottomright' }).addTo(mapa);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(mapa);

  function avisarSelecao(id) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(id);        // celular
    } else if (window.parent) {
      window.parent.postMessage({ tipo: 'parada', id: id }, '*');  // navegador
    }
  }

  var pontos = [];

  if (dados.origem) {
    pontos.push([dados.origem.lat, dados.origem.lng]);
    L.marker([dados.origem.lat, dados.origem.lng], {
      icon: L.divIcon({ className: '', html: '<div class="marcador-origem"></div>', iconSize: [14, 14], iconAnchor: [7, 7] })
    }).addTo(mapa).bindPopup('Você está aqui');
  }

  dados.paradas.forEach(function (parada) {
    var posicao = [parada.lat, parada.lng];
    pontos.push(posicao);

    L.marker(posicao, {
      icon: L.divIcon({
        className: '',
        html: '<div class="marcador">' + parada.ordem + '</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })
    })
      .addTo(mapa)
      .bindPopup(parada.ordem + '. ' + parada.nome)
      .on('click', function () { avisarSelecao(parada.id); });
  });

  // Um segmento por trecho, para diferenciar o que é feito a pé.
  for (var i = 1; i < pontos.length; i++) {
    var parada = dados.paradas[dados.origem ? i - 1 : i];
    var aPe = parada && parada.modalAteAqui === 'pe';
    L.polyline([pontos[i - 1], pontos[i]], {
      color: aPe ? '${corSucesso}' : '${corPrimaria}',
      weight: 4,
      opacity: 0.85,
      dashArray: aPe ? '2 8' : null,
      lineCap: 'round'
    }).addTo(mapa);
  }

  if (pontos.length > 1) {
    mapa.fitBounds(L.latLngBounds(pontos), { padding: [34, 34] });
  } else if (pontos.length === 1) {
    mapa.setView(pontos[0], 15);
  } else {
    mapa.setView([-4.9712, -39.0156], 13);
  }
</script>
</body>
</html>`;
}
