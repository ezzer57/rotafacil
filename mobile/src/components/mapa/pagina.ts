/**
 * Base comum das páginas de mapa (roteiro e ponto de partida).
 *
 * Cada mapa é uma página HTML à parte, que roda num WebView no celular e num
 * iframe no navegador. Aqui ficam as partes que as duas repetiam e os
 * cuidados de segurança:
 *
 * - o Leaflet vem embutido no app (leaflet-embutido.ts), sem baixar de
 *   terceiros;
 * - os dados entram na página como JSON escapado: um nome de lugar com
 *   "</script>" não fecha o script nem injeta código;
 * - as cores só entram se forem cores (#rrggbb), porque vão para o CSS;
 * - os textos que vêm dos dados (nome do lugar) entram como texto, nunca
 *   como HTML (ver `texto()` no script de cada mapa).
 *
 * Só o OpenStreetMap continua sendo chamado, para as imagens do mapa.
 */

import { LEAFLET_CSS, LEAFLET_JS } from './leaflet-embutido';

/**
 * JSON que pode ir dentro de um <script>: "<" vira \u003c, então nenhum valor
 * fecha a tag. Os separadores de linha do Unicode também são escapados, porque
 * quebram código JavaScript.
 */
export function jsonSeguro(valor: unknown): string {
  return JSON.stringify(valor)
    .replace(/</g, '\\u003c')
    .split(SEPARADOR_DE_LINHA)
    .join('\\u2028')
    .split(SEPARADOR_DE_PARAGRAFO)
    .join('\\u2029');
}

const SEPARADOR_DE_LINHA = String.fromCharCode(0x2028);
const SEPARADOR_DE_PARAGRAFO = String.fromCharCode(0x2029);

/** Só aceita cor em hexadecimal; qualquer outra coisa vira cinza. */
export function corSegura(cor: string): string {
  return /^#[0-9a-f]{3,8}$/i.test(cor) ? cor : '#888888';
}

interface OpcoesPagina {
  corFundo: string;
  escuro: boolean;
  /** CSS próprio do mapa. */
  estilos: string;
  /** Dados do mapa, disponíveis no script como `dados`. */
  dados: unknown;
  /** Script próprio do mapa; já recebe `mapa`, `dados` e `texto()` prontos. */
  script: string;
}

export function paginaDoMapa({ corFundo, escuro, estilos, dados, script }: OpcoesPagina): string {
  const fundo = corSegura(corFundo);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>${LEAFLET_CSS}</style>
<style>
  html, body, #mapa { height: 100%; margin: 0; padding: 0; background: ${fundo}; }
  .leaflet-container { background: ${fundo}; font-family: -apple-system, system-ui, sans-serif; }
  /* No tema escuro, inverte as imagens do mapa para não ofuscar à noite. */
  .escuro .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.92); }
  .leaflet-control-attribution { font-size: 9px; opacity: .8; }
${estilos}
</style>
</head>
<body class="${escuro ? 'escuro' : ''}">
<div id="mapa"></div>
<script>${LEAFLET_JS}</script>
<script>
  var dados = ${jsonSeguro(dados)};

  /** Texto vindo dos dados entra como texto, nunca como HTML. */
  function texto(conteudo) {
    var elemento = document.createElement('div');
    elemento.textContent = conteudo;
    return elemento;
  }

  var mapa = L.map('mapa', { zoomControl: false, attributionControl: false });
  L.control.zoom({ position: 'bottomright' }).addTo(mapa);
  // Crédito em texto, sem link: dentro do WebView um link trocaria o mapa
  // pela página de destino, sem botão de voltar.
  L.control.attribution({ prefix: false }).addTo(mapa);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    // Crédito exigido pela licença ODbL dos dados do OpenStreetMap; as rotas
    // também vêm desses dados.
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapa);

${script}
</script>
</body>
</html>`;
}
