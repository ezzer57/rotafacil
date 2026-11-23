/**
 * Página do mapa do roteiro: as paradas numeradas, a posição de partida e o
 * trecho entre elas (pelas ruas quando há traçado; reta, mais clara, quando
 * não há).
 *
 * O mesmo HTML é usado nas duas plataformas: dentro de um WebView no celular
 * e de um iframe no navegador. A base (Leaflet embutido, mapa do
 * OpenStreetMap e os cuidados de segurança) está em pagina.ts.
 */

import { corSegura, paginaDoMapa } from './pagina';
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
  const primaria = corSegura(corPrimaria);
  const sucesso = corSegura(corSucesso);

  return paginaDoMapa({
    corFundo,
    escuro,
    dados: { origem: origem ?? null, paradas, cores: { primaria, sucesso } },
    estilos: `
  .marcador {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 999px;
    background: ${primaria}; color: #fff;
    font-size: 13px; font-weight: 700;
    border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.35);
  }
  /* Parada em que o usuário já chegou: visto no lugar do número. */
  .marcador-visitado {
    background: #fff; color: ${sucesso};
    border: 2px solid ${sucesso};
    font-size: 15px;
  }
  .marcador-origem {
    width: 14px; height: 14px; border-radius: 999px;
    background: #fff; border: 4px solid ${sucesso};
    box-shadow: 0 2px 6px rgba(0,0,0,.35);
  }`,
    script: `
  function avisarSelecao(id) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(id);                   // celular
    } else if (window.parent) {
      window.parent.postMessage({ tipo: 'parada', id: id }, '*');  // navegador
    }
  }

  var pontos = [];

  if (dados.origem) {
    pontos.push([dados.origem.lat, dados.origem.lng]);
    L.marker([dados.origem.lat, dados.origem.lng], {
      icon: L.divIcon({ className: '', html: '<div class="marcador-origem"></div>', iconSize: [14, 14], iconAnchor: [7, 7] })
    }).addTo(mapa).bindPopup(texto('Você está aqui'));
  }

  dados.paradas.forEach(function (parada) {
    var posicao = [parada.lat, parada.lng];
    pontos.push(posicao);

    // O número vem do app, mas entra como texto do mesmo jeito.
    var marcador = document.createElement('div');
    marcador.className = parada.visitada ? 'marcador marcador-visitado' : 'marcador';
    marcador.textContent = parada.visitada ? '\\u2713' : String(parada.ordem);

    L.marker(posicao, {
      icon: L.divIcon({ className: '', html: marcador, iconSize: [28, 28], iconAnchor: [14, 14] }),
      // Parada já visitada fica atrás das que ainda faltam.
      zIndexOffset: parada.visitada ? -100 : 0
    })
      .addTo(mapa)
      .bindPopup(texto(parada.ordem + '. ' + parada.nome + (parada.visitada ? ' (você já chegou)' : '')))
      .on('click', function () { avisarSelecao(parada.id); });
  });

  // Tudo o que precisa caber na tela, inclusive as curvas das ruas.
  var limites = pontos.slice();

  // Um segmento por trecho, para diferenciar o que é feito a pé. Quando há
  // traçado, a linha segue as ruas; sem ele, é a reta entre os dois pontos,
  // mais clara para não se passar por caminho de verdade. O trecho até uma
  // parada em que o usuário já chegou sai do mapa: fica só o que falta fazer.
  for (var i = 1; i < pontos.length; i++) {
    var parada = dados.paradas[dados.origem ? i - 1 : i];
    if (parada && parada.visitada) continue;
    var aPe = parada && parada.modalAteAqui === 'pe';
    var ruas = parada && parada.trajetoAteAqui && parada.trajetoAteAqui.length > 1;
    var linha = ruas ? parada.trajetoAteAqui : [pontos[i - 1], pontos[i]];
    L.polyline(linha, {
      color: aPe ? dados.cores.sucesso : dados.cores.primaria,
      weight: ruas ? 5 : 3,
      opacity: ruas ? 0.9 : 0.45,
      dashArray: aPe ? '2 8' : null,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(mapa);
    if (ruas) linha.forEach(function (p) { limites.push(p); });
  }

  if (pontos.length > 1) {
    mapa.fitBounds(L.latLngBounds(limites), { padding: [34, 34] });
  } else if (pontos.length === 1) {
    mapa.setView(pontos[0], 15);
  } else {
    mapa.setView([-4.9712, -39.0156], 13);
  }`,
  });
}
