#!/usr/bin/env node
/**
 * Gera src/components/mapa/leaflet-embutido.ts com o Leaflet (JS e CSS)
 * dentro do código do aplicativo.
 *
 * Os mapas rodam numa página própria (WebView no celular, iframe no
 * navegador). Antes, essa página baixava o Leaflet do unpkg a cada abertura:
 * mais um terceiro recebendo o IP do usuário, e o mapa fora do ar se o unpkg
 * caísse. Com o arquivo embutido, nada disso acontece.
 *
 * Uso, depois de mudar a versão do pacote "leaflet":
 *   npm run leaflet:embutir
 *
 * O script confere o hash de cada arquivo com o publicado pelo Leaflet
 * (https://leafletjs.com/download.html). Ao trocar de versão, atualize os
 * hashes abaixo com os da página oficial.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const VERSAO = '1.9.4';
const HASHES = {
  'leaflet.js': 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=',
  'leaflet.css': 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=',
};

const raiz = path.resolve(__dirname, '..');
const pasta = path.join(raiz, 'node_modules', 'leaflet', 'dist');
const destino = path.join(raiz, 'src', 'components', 'mapa', 'leaflet-embutido.ts');

const instalada = require(path.join(raiz, 'node_modules', 'leaflet', 'package.json')).version;
if (instalada !== VERSAO) {
  throw new Error(`Leaflet instalado é ${instalada}; este script espera ${VERSAO}.`);
}

function ler(nome) {
  const conteudo = fs.readFileSync(path.join(pasta, nome));
  const hash = `sha256-${crypto.createHash('sha256').update(conteudo).digest('base64')}`;
  if (hash !== HASHES[nome]) {
    throw new Error(`${nome} não confere com o hash oficial: ${hash}`);
  }
  const texto = conteudo.toString('utf8');
  // O conteúdo vai dentro de <script> e <style>: não pode fechar a tag antes.
  if (/<\/(script|style)/i.test(texto)) {
    throw new Error(`${nome} contém uma tag de fechamento e não pode ser embutido assim.`);
  }
  return texto;
}

const js = ler('leaflet.js');
const css = ler('leaflet.css');

const cabecalho = `/**
 * Leaflet ${VERSAO} embutido no aplicativo (licença BSD-2-Clause; o aviso de
 * direitos autorais vai junto, no começo do código).
 *
 * ARQUIVO GERADO por scripts/embutir-leaflet.js a partir do pacote "leaflet".
 * Não edite à mão: mude a versão no package.json e rode
 * "npm run leaflet:embutir".
 *
 * Hashes conferidos com os oficiais:
 *   leaflet.js  ${HASHES['leaflet.js']}
 *   leaflet.css ${HASHES['leaflet.css']}
 */
`;

fs.writeFileSync(
  destino,
  `${cabecalho}
export const LEAFLET_VERSAO = ${JSON.stringify(VERSAO)};
export const LEAFLET_CSS = ${JSON.stringify(css)};
export const LEAFLET_JS = ${JSON.stringify(js)};
`,
);

console.log(`Gerado ${path.relative(raiz, destino)} (${Math.round((js.length + css.length) / 1024)} KB).`);
