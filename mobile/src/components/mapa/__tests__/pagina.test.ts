/**
 * Segurança das páginas de mapa: dados escapados, nomes como texto, Leaflet
 * embutido (sem terceiros além das imagens do OpenStreetMap).
 */

import { construirHtmlMapaPartida } from '../html-partida';
import { construirHtmlMapa } from '../html';
import { LEAFLET_CSS, LEAFLET_JS, LEAFLET_VERSAO } from '../leaflet-embutido';
import { corSegura, jsonSeguro } from '../pagina';

const NOME_MALICIOSO = '</script><img src=x onerror=alert(1)>';

const cores = { corPrimaria: '#4F6DF5', corSucesso: '#12B76A', corFundo: '#F6F7F9' };

function mapaComNome(nome: string) {
  return construirHtmlMapa({
    origem: { lat: -4.97, lng: -39.01 },
    paradas: [{ id: 'p1', nome, ordem: 1, lat: -4.96, lng: -39.0, modalAteAqui: 'pe' }],
    escuro: false,
    ...cores,
  });
}

describe('jsonSeguro', () => {
  it('nenhum valor fecha a tag <script>, e o JSON continua o mesmo', () => {
    const dados = { nome: NOME_MALICIOSO };
    const saida = jsonSeguro(dados);

    expect(saida).not.toContain('<');
    expect(JSON.parse(saida)).toEqual(dados);
  });

  it('escapa os separadores de linha do Unicode, que quebram o JavaScript', () => {
    const separadores = `a${String.fromCharCode(0x2028)}b${String.fromCharCode(0x2029)}c`;
    const saida = jsonSeguro({ texto: separadores });

    expect(saida).not.toContain(String.fromCharCode(0x2028));
    expect(saida).not.toContain(String.fromCharCode(0x2029));
    expect(JSON.parse(saida).texto).toBe(separadores);
  });
});

describe('corSegura', () => {
  it('aceita cor hexadecimal e troca o resto por cinza', () => {
    expect(corSegura('#4F6DF5')).toBe('#4F6DF5');
    expect(corSegura('red; } body { display: none')).toBe('#888888');
  });
});

describe('páginas de mapa', () => {
  it('um nome de lugar malicioso não fecha o script nem vira HTML', () => {
    const html = mapaComNome(NOME_MALICIOSO);

    expect(html).not.toContain('<img src=x');
    // Só fecham os dois scripts da página: o Leaflet e o do mapa.
    expect(html.split('</script>')).toHaveLength(3);
    // O nome entra no balão do marcador como texto.
    expect(html).toContain('textContent');
  });

  it('não baixa nada de terceiros: o Leaflet vem embutido', () => {
    const paginas = [
      mapaComNome('Museu'),
      construirHtmlMapaPartida({
        posicao: null,
        precisaoM: null,
        partida: { lat: -4.97, lng: -39.01 },
        escuro: true,
        ...cores,
      }),
    ];

    for (const html of paginas) {
      expect(html).not.toMatch(/<script[^>]+src=/);
      expect(html).not.toMatch(/<link[^>]+stylesheet/);
      expect(html).not.toContain('unpkg');
      expect(html).toContain(`Leaflet ${LEAFLET_VERSAO}`);
      // Fora o código do Leaflet (que cita endereços só em comentários), o
      // único endereço da página é o das imagens do OpenStreetMap.
      const nossaParte = html.replace(LEAFLET_JS, '').replace(LEAFLET_CSS, '');
      const enderecos = nossaParte.match(/https:[^'"\s)]+/g) ?? [];
      expect(new Set(enderecos)).toEqual(
        new Set(['https://tile.openstreetmap.org/{z}/{x}/{y}.png']),
      );
    }
  });
});
