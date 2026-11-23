/**
 * Contraste das cores usadas como texto, nos dois temas (WCAG 2.1, nível AA:
 * pelo menos 4,5:1 para texto comum). Mudou uma cor do tema e este teste
 * falhou? A combinação ficou difícil de ler.
 */

import { paletaClara, paletaEscura, type Paleta } from '../tokens';

const linear = (canal: number) => {
  const c = canal / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

function luminancia(cor: string): number {
  const n = parseInt(cor.slice(1), 16);
  return 0.2126 * linear(n >> 16) + 0.7152 * linear((n >> 8) & 255) + 0.0722 * linear(n & 255);
}

export function contraste(a: string, b: string): number {
  const [clara, escura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (clara + 0.05) / (escura + 0.05);
}

/** [cor do texto, cor do fundo], como aparecem nas telas. */
const COMBINACOES: [keyof Paleta, keyof Paleta][] = [
  ['texto', 'fundo'],
  ['texto', 'superficie'],
  ['textoSuave', 'fundo'],
  ['textoSuave', 'fundoAlt'],
  ['textoSuave', 'superficie'],
  ['primaria', 'fundo'],
  ['primaria', 'superficie'],
  ['primaria', 'primariaSuave'],
  ['textoSobrePrimaria', 'primaria'],
  ['tintaTexto', 'tinta'],
  ['sucesso', 'superficie'],
  ['sucesso', 'sucessoSuave'],
  ['alerta', 'superficie'],
  ['alerta', 'alertaSuave'],
  ['erro', 'superficie'],
  ['erro', 'erroSuave'],
];

describe.each([
  ['claro', paletaClara],
  ['escuro', paletaEscura],
])('tema %s', (_nome, paleta) => {
  it.each(COMBINACOES)('%s sobre %s passa de 4,5:1', (texto, fundo) => {
    expect(contraste(paleta[texto], paleta[fundo])).toBeGreaterThanOrEqual(4.5);
  });
});

describe('contraste', () => {
  it('confere com valores conhecidos', () => {
    expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contraste('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });
});
