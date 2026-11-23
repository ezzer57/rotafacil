/**
 * Design tokens do RotaFacil.
 *
 * Existem duas paletas com exatamente as mesmas chaves: clara e escura.
 * As telas nunca importam uma paleta diretamente - elas pedem a paleta ativa
 * ao hook useCores() (src/theme/provider.tsx). Assim, acrescentar ou mudar
 * uma cor do tema significa mexer somente neste arquivo.
 *
 * Medidas, raios, tipografia e sombras nao mudam entre os temas.
 *
 * Contraste: toda cor usada como texto passa de 4,5:1 sobre os fundos em que
 * aparece (WCAG 2.1, nível AA). Por isso as cores de sucesso, alerta, erro e
 * a primária são mais escuras no tema claro do que um tom "vivo" seria. O
 * teste src/theme/__tests__/contraste.test.ts confere isso a cada mudança.
 */

export const paletaClara = {
  // superficies
  fundo: '#FFFFFF',
  fundoAlt: '#F6F7F9',
  superficie: '#FFFFFF',
  borda: '#ECEDF1',
  bordaForte: '#D9DBE1',

  // texto
  texto: '#11131A',
  textoSuave: '#6B7280',
  /** Texto sobre fotos: branco nos dois temas. */
  textoSobreImagem: '#FFFFFF',

  // marca
  primaria: '#3D5AE6',
  primariaSuave: '#EDF1FE',
  /** Texto e ícone sobre a cor primária (botão secundário). */
  textoSobrePrimaria: '#FFFFFF',
  /** Cor do botao principal e do texto dentro dele. */
  tinta: '#171A21',
  tintaTexto: '#FFFFFF',

  // semanticas
  sucesso: '#027A48',
  sucessoSuave: '#E8F8F0',
  alerta: '#B54708',
  alertaSuave: '#FEF4E6',
  erro: '#B42318',
  erroSuave: '#FEECEB',

  // categorias de ponto de interesse
  cultura: '#8B5CF6',
  natureza: '#12B76A',
  gastronomia: '#F79009',
  compras: '#EC4899',
  vidaNoturna: '#6366F1',
  religioso: '#0EA5E9',
};

export type Paleta = typeof paletaClara;

export const paletaEscura: Paleta = {
  fundo: '#0E1117',
  fundoAlt: '#1A1F29',
  superficie: '#151A23',
  borda: '#232A36',
  bordaForte: '#39424F',

  texto: '#F2F4F8',
  textoSuave: '#9AA3B2',
  textoSobreImagem: '#FFFFFF',

  primaria: '#7B93FF',
  primariaSuave: '#1C2338',
  // O azul do tema escuro é claro: texto branco sobre ele não se lê bem.
  textoSobrePrimaria: '#0E1117',
  tinta: '#F2F4F8',
  tintaTexto: '#0E1117',

  sucesso: '#34D399',
  sucessoSuave: '#11291F',
  alerta: '#FBBF24',
  alertaSuave: '#2B2113',
  erro: '#F87171',
  erroSuave: '#2C1718',

  cultura: '#A78BFA',
  natureza: '#34D399',
  gastronomia: '#FBBF24',
  compras: '#F472B6',
  vidaNoturna: '#818CF8',
  religioso: '#38BDF8',
};

export const espaco = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const raio = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pilula: 999,
} as const;

export const fonte = {
  tamanho: {
    micro: 11,
    pequeno: 13,
    corpo: 15,
    destaque: 17,
    titulo: 22,
    display: 28,
  },
  peso: {
    normal: '400',
    medio: '500',
    semi: '600',
    forte: '700',
  },
} as const;

/** No tema escuro a sombra e quase imperceptivel; a borda faz a separacao. */
export const sombra = {
  cartao: {
    shadowColor: '#0B1220',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  flutuante: {
    shadowColor: '#0B1220',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;
