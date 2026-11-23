/**
 * Dados das cidades atendidas: cidades, tarifas de táxi e pontos de interesse.
 *
 * FONTE ÚNICA. A carga do banco (prisma/seed.ts) e o modo de demonstração do
 * aplicativo (mobile/src/data/mock/dados.ts) leem daqui. Antes eram duas
 * cópias escritas à mão, que precisavam ser mudadas juntas.
 *
 * Por isso este arquivo não importa nada: nem Prisma, nem bibliotecas. O
 * aplicativo o lê pelo atalho @dados (ver mobile/metro.config.js).
 *
 * PONTOS: nome, coordenada e endereço vêm do OpenStreetMap (© colaboradores
 * do OpenStreetMap, licença ODbL), conferidos em 11/11/2026; `fonte` guarda o
 * elemento de origem. A coordenada é a do ponto de chegada (a entrada, o
 * início da trilha), e não a do centro do lugar: é para onde a rota leva.
 *
 * O que ainda é suposição:
 *  - horário com `fonte: 'suposto'`: janela típica do tipo de lugar, a
 *    confirmar. Com 'osm', veio do mapa, na janela dos dias úteis;
 *  - tempo de visita e faixa de preço: estimativas do autor;
 *  - relevância: curadoria do autor, a validar com quem conhece cada cidade;
 *  - nota e avaliações: nenhum ponto tem, porque o OpenStreetMap não traz
 *    avaliações. A escolha das paradas usa a relevância com a nota neutra.
 *
 * TARIFAS: PROVISÓRIAS. Precisam ser trocadas pelos valores dos decretos
 * municipais de Quixadá e Fortaleza, com a norma de origem em `norma`, que é
 * o que torna a estimativa auditável.
 */

export type CategoriaDoPonto =
  'cultura' | 'natureza' | 'gastronomia' | 'compras' | 'vidaNoturna' | 'religioso';

export interface CidadeDados {
  id: string;
  nome: string;
  uf: string;
  pais: string;
  bandeira: string;
  /** Centro da cidade. */
  lat: number;
  lng: number;
}

export interface TarifaDados {
  cidadeId: string;
  bandeirada: number;
  kmBandeira1: number;
  kmBandeira2: number;
  horaParada: number;
  /** Fator de calibração para transporte por aplicativo (equação 10). */
  alfa: number;
  alfaP10: number;
  alfaP90: number;
  norma: string;
}

export interface PontoDados {
  /** Prefixo da cidade (qx-, fz-) e nome do lugar. */
  id: string;
  cidadeId: string;
  nome: string;
  categoria: CategoriaDoPonto;
  endereco: string;
  /** Ponto de chegada: a entrada ou o início da trilha. */
  lat: number;
  lng: number;
  /** Faixa de preço de 0 (grátis) a 4 (muito caro); null quando não se sabe. */
  faixaPreco: number | null;
  tempoVisitaMin: number;
  /**
   * Quanto o lugar é imperdível, com o mesmo critério em todas as cidades:
   *   5  símbolo da cidade: quem não vê, não conheceu o lugar
   *   4  grande atrativo
   *   3  vale a visita
   *   2  complementar (uma refeição ou um passeio curto)
   *   1  só se sobrar tempo
   */
  relevancia: 1 | 2 | 3 | 4 | 5;
  /**
   * Lugar público ao ar livre (parque, praça, praia, mirante, trilha): nunca
   * fica fora do horário no roteiro, mesmo com horário anotado aqui. O Parque
   * do Cocó tem portões no OpenStreetMap, mas por decisão do projeto entra
   * como os demais.
   */
  arLivre: boolean;
  /** Janela de funcionamento ("08:00" a "17:00"); null quando não fecha. */
  horario: { abre: string; fecha: string; fonte: 'osm' | 'suposto' } | null;
  /**
   * Foto do Wikimedia Commons, só com licença livre (domínio público, CC0,
   * CC BY ou CC BY-SA), conferida uma a uma; o crédito vai junto da foto no
   * aplicativo. null quando não há foto livre conhecida.
   */
  foto: { url: string; credito: string; fonte: string } | null;
  /** Elemento do OpenStreetMap de onde vieram nome e coordenada. */
  fonte: string;
  /** Anotação da curadoria, para quem mantém os dados. */
  observacao?: string;
}

export const CIDADES: CidadeDados[] = [
  {
    id: 'quixada',
    nome: 'Quixadá',
    uf: 'CE',
    pais: 'Brasil',
    bandeira: '🇧🇷',
    lat: -4.9712,
    lng: -39.0156,
  },
  {
    id: 'fortaleza',
    nome: 'Fortaleza',
    uf: 'CE',
    pais: 'Brasil',
    bandeira: '🇧🇷',
    lat: -3.7319,
    lng: -38.5267,
  },
];

export const TARIFAS: TarifaDados[] = [
  {
    cidadeId: 'quixada',
    bandeirada: 5,
    kmBandeira1: 3,
    kmBandeira2: 3.6,
    horaParada: 28,
    alfa: 0.85,
    alfaP10: 0.72,
    alfaP90: 1.05,
    norma: 'PROVISÓRIO - substituir pelo decreto municipal de Quixadá',
  },
  {
    cidadeId: 'fortaleza',
    bandeirada: 5.5,
    kmBandeira1: 3.2,
    kmBandeira2: 3.9,
    horaParada: 30,
    alfa: 0.82,
    alfaP10: 0.68,
    alfaP90: 1.1,
    norma: 'PROVISÓRIO - substituir pelo decreto municipal de Fortaleza',
  },
];

export const PONTOS: PontoDados[] = [
  // ----------------------------------------------------- Quixadá
  {
    id: 'qx-acude-cedro',
    cidadeId: 'quixada',
    nome: 'Açude do Cedro',
    categoria: 'natureza',
    endereco: 'Açude do Cedro, Quixadá - CE',
    lat: -4.980879,
    lng: -39.063945,
    faixaPreco: null,
    tempoVisitaMin: 60,
    relevancia: 5,
    arLivre: true,
    horario: { abre: '06:00', fecha: '17:30', fonte: 'suposto' },
    foto: {
      url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/aa/A%C3%A7ude_Cedro_-_Cart%C3%A3o_postal_do_Cear%C3%A1.jpg/500px-A%C3%A7ude_Cedro_-_Cart%C3%A3o_postal_do_Cear%C3%A1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
      credito: 'Foto: GLandovsky · CC BY-SA 4.0 · Wikimedia Commons',
      fonte:
        'https://commons.wikimedia.org/wiki/File:A%C3%A7ude_Cedro_-_Cart%C3%A3o_postal_do_Cear%C3%A1.jpg',
    },
    fonte: 'osm:node/4663218625',
    observacao:
      'Fica ao lado da trilha da Galinha Choca: quem chega de carro para junto dos galpões e segue a pé.',
  },
  {
    id: 'qx-galinha-choca',
    cidadeId: 'quixada',
    nome: 'Pedra da Galinha Choca',
    categoria: 'natureza',
    endereco: 'Trilha da Galinha Choca, Açude do Cedro, Quixadá - CE',
    lat: -4.980313,
    lng: -39.064697,
    faixaPreco: null,
    tempoVisitaMin: 60,
    relevancia: 5,
    arLivre: true,
    horario: { abre: '06:00', fecha: '17:30', fonte: 'suposto' },
    foto: {
      url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2d/Pedra_da_Galinha_Choca.jpg/500px-Pedra_da_Galinha_Choca.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
      credito: 'Foto: Krewinkel-Terto de Amorim · domínio público · Wikimedia Commons',
      fonte: 'https://commons.wikimedia.org/wiki/File:Pedra_da_Galinha_Choca.jpg',
    },
    fonte: 'osm:node/4663218620',
    observacao:
      'Fica ao lado do Açude do Cedro: quem chega de carro para junto dos galpões e segue a pé.',
  },
  {
    id: 'qx-pedra-cruzeiro',
    cidadeId: 'quixada',
    nome: 'Pedra do Cruzeiro',
    categoria: 'natureza',
    endereco: 'Avenida Plácido Castelo, Herval, Quixadá - CE',
    lat: -4.968082,
    lng: -39.016203,
    faixaPreco: null,
    tempoVisitaMin: 45,
    relevancia: 4,
    arLivre: true,
    horario: { abre: '06:00', fecha: '17:30', fonte: 'suposto' },
    foto: {
      url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d9/Pedra_do_cruzeiro_-_quixada_ce.JPG/500px-Pedra_do_cruzeiro_-_quixada_ce.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
      credito: 'Foto: Fábio Barros · CC BY 2.5 · Wikimedia Commons',
      fonte: 'https://commons.wikimedia.org/wiki/File:Pedra_do_cruzeiro_-_quixada_ce.JPG',
    },
    fonte: 'osm:node/4663218683',
  },
  {
    id: 'qx-chale-da-pedra',
    cidadeId: 'quixada',
    nome: 'Chalé da Pedra',
    categoria: 'cultura',
    endereco: 'Rua Oscar Barbosa, Baviera, Quixadá - CE',
    lat: -4.971541,
    lng: -39.014195,
    faixaPreco: null,
    tempoVisitaMin: 30,
    relevancia: 3,
    arLivre: false,
    horario: { abre: '08:00', fecha: '17:00', fonte: 'suposto' },
    foto: {
      url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/40/Chale_da_pedra_quixada_ce.JPG/500px-Chale_da_pedra_quixada_ce.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
      credito: 'Foto: domínio público · Wikimedia Commons',
      fonte: 'https://commons.wikimedia.org/wiki/File:Chale_da_pedra_quixada_ce.JPG',
    },
    fonte: 'osm:way/438218757',
  },
  {
    id: 'qx-museu-jacinto-sousa',
    cidadeId: 'quixada',
    nome: 'Museu Histórico Jacinto de Sousa',
    categoria: 'cultura',
    endereco: 'Rua Autran Moreno, Baviera, Quixadá - CE',
    lat: -4.96944,
    lng: -39.012282,
    faixaPreco: null,
    tempoVisitaMin: 45,
    relevancia: 3,
    arLivre: false,
    horario: { abre: '08:00', fecha: '17:00', fonte: 'suposto' },
    foto: {
      url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/Museu_historico_jacinto_de_sousa.JPG/500px-Museu_historico_jacinto_de_sousa.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
      credito: 'Foto: Fábio Barros · domínio público · Wikimedia Commons',
      fonte: 'https://commons.wikimedia.org/wiki/File:Museu_historico_jacinto_de_sousa.JPG',
    },
    fonte: 'osm:node/4670214870',
  },
  {
    id: 'qx-memorial-cego-aderaldo',
    cidadeId: 'quixada',
    nome: 'Memorial Cego Aderaldo',
    categoria: 'cultura',
    endereco: 'Rua Pascoal Crispino, Sitiá Oeste, Quixadá - CE',
    lat: -4.970161,
    lng: -39.015271,
    faixaPreco: null,
    tempoVisitaMin: 30,
    relevancia: 3,
    arLivre: false,
    horario: { abre: '08:00', fecha: '17:00', fonte: 'suposto' },
    foto: {
      url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Monumento_cego_aderaldo_quixada_CE.JPG/500px-Monumento_cego_aderaldo_quixada_CE.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
      credito: 'Foto: Fábio Barros · CC BY-SA 2.5 · Wikimedia Commons',
      fonte: 'https://commons.wikimedia.org/wiki/File:Monumento_cego_aderaldo_quixada_CE.JPG',
    },
    fonte: 'osm:way/645475040',
    observacao: 'No mapa o nome está grafado "Alderado"; o do poeta é Aderaldo.',
  },
  {
    id: 'qx-catedral',
    cidadeId: 'quixada',
    nome: 'Catedral de Quixadá',
    categoria: 'religioso',
    endereco: 'Avenida Doutor Arcelino de Queiroz Lima, Herval, Quixadá - CE',
    lat: -4.967164,
    lng: -39.016913,
    faixaPreco: null,
    tempoVisitaMin: 20,
    relevancia: 3,
    arLivre: false,
    horario: { abre: '07:00', fecha: '19:00', fonte: 'suposto' },
    foto: {
      url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Catedral_Quixad%C3%A1.jpg/500px-Catedral_Quixad%C3%A1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
      credito: 'Foto: GLandovsky · CC BY 4.0 · Wikimedia Commons',
      fonte: 'https://commons.wikimedia.org/wiki/File:Catedral_Quixad%C3%A1.jpg',
    },
    fonte: 'osm:way/1181239160',
  },
  {
    id: 'qx-santuario-rainha-sertao',
    cidadeId: 'quixada',
    nome: 'Santuário Rainha do Sertão',
    categoria: 'religioso',
    endereco: 'Serra do Urucum, Quixadá - CE',
    lat: -5.038487,
    lng: -39.009256,
    faixaPreco: null,
    tempoVisitaMin: 60,
    relevancia: 4,
    arLivre: false,
    horario: { abre: '07:00', fecha: '17:00', fonte: 'suposto' },
    foto: {
      url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Quixad%C3%A1_CE_Brasil_-_Santu%C3%A1rio_Rainha_do_Sert%C3%A3o_-_panoramio.jpg/500px-Quixad%C3%A1_CE_Brasil_-_Santu%C3%A1rio_Rainha_do_Sert%C3%A3o_-_panoramio.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
      credito: 'Foto: Jorge Colares · CC BY-SA 3.0 · Wikimedia Commons',
      fonte:
        'https://commons.wikimedia.org/wiki/File:Quixad%C3%A1_CE_Brasil_-_Santu%C3%A1rio_Rainha_do_Sert%C3%A3o_-_panoramio.jpg',
    },
    fonte: 'osm:way/438218565',
  },
  {
    id: 'qx-mercado-publico',
    cidadeId: 'quixada',
    nome: 'Mercado Público Municipal',
    categoria: 'compras',
    endereco: 'Travessa Leovigildo Barreto, Herval, Quixadá - CE',
    lat: -4.969671,
    lng: -39.017092,
    faixaPreco: 1,
    tempoVisitaMin: 30,
    relevancia: 3,
    arLivre: false,
    horario: { abre: '06:00', fecha: '17:00', fonte: 'suposto' },
    foto: null,
    fonte: 'osm:way/388454618',
  },
  {
    id: 'qx-sabores-do-sertao',
    cidadeId: 'quixada',
    nome: 'Sabores do Sertão',
    categoria: 'gastronomia',
    endereco: 'Avenida Plácido Castelo, Herval, Quixadá - CE',
    lat: -4.968914,
    lng: -39.015988,
    faixaPreco: 2,
    tempoVisitaMin: 60,
    relevancia: 2,
    arLivre: false,
    horario: { abre: '09:30', fecha: '15:30', fonte: 'osm' },
    foto: null,
    fonte: 'osm:way/394341880',
  },
  {
    id: 'qx-maria-pitanga',
    cidadeId: 'quixada',
    nome: 'Maria Pitanga Açaiteria',
    categoria: 'gastronomia',
    endereco: 'Rua Basilio Emiliano Pinto, 309, Combate, Quixadá - CE',
    lat: -4.970145,
    lng: -39.018402,
    faixaPreco: 1,
    tempoVisitaMin: 30,
    relevancia: 2,
    arLivre: false,
    horario: { abre: '12:00', fecha: '23:00', fonte: 'osm' },
    foto: null,
    fonte: 'osm:node/4781914521',
  },
  {
    id: 'qx-peixada-abelardo',
    cidadeId: 'quixada',
    nome: 'Peixada O Abelardo',
    categoria: 'gastronomia',
    endereco: 'Avenida Plácido Castelo, Triângulo, Quixadá - CE',
    lat: -4.962965,
    lng: -39.015442,
    faixaPreco: 2,
    tempoVisitaMin: 60,
    relevancia: 3,
    arLivre: false,
    horario: { abre: '11:00', fecha: '15:00', fonte: 'suposto' },
    foto: null,
    fonte: 'osm:node/4663218654',
  },
  {
    id: 'qx-itajuba',
    cidadeId: 'quixada',
    nome: 'Itajubá',
    categoria: 'gastronomia',
    endereco: 'Avenida Francisco Pinheiro de Almeida, Planalto Universitário, Quixadá - CE',
    lat: -4.96289,
    lng: -39.024273,
    faixaPreco: 2,
    tempoVisitaMin: 60,
    relevancia: 2,
    arLivre: false,
    horario: { abre: '11:00', fecha: '15:00', fonte: 'suposto' },
    foto: null,
    fonte: 'osm:node/2638422688',
  },
  // --------------------------------------------------- Fortaleza
  {
    id: 'fz-mercado-central',
    cidadeId: 'fortaleza',
    nome: 'Mercado Central',
    categoria: 'compras',
    endereco: 'Avenida Alberto Nepomuceno, 199, Centro, Fortaleza - CE',
    lat: -3.723429,
    lng: -38.52395,
    faixaPreco: 2,
    tempoVisitaMin: 60,
    relevancia: 4,
    arLivre: false,
    horario: { abre: '08:00', fecha: '18:00', fonte: 'osm' },
    foto: {
      url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/Mar2024._Mercado_Central_de_Fortaleza%2C_Cear%C3%A1%2C_Brazil_01.jpg/500px-Mar2024._Mercado_Central_de_Fortaleza%2C_Cear%C3%A1%2C_Brazil_01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
      credito: 'Foto: Ridiculopathy · CC0 · Wikimedia Commons',
      fonte:
        'https://commons.wikimedia.org/wiki/File:Mar2024._Mercado_Central_de_Fortaleza,_Cear%C3%A1,_Brazil_01.jpg',
    },
    fonte: 'osm:way/24395456',
  },
  {
    id: 'fz-dragao-do-mar',
    cidadeId: 'fortaleza',
    nome: 'Centro Dragão do Mar',
    categoria: 'cultura',
    endereco: 'Rua Dragão do Mar, 81, Praia de Iracema, Fortaleza - CE',
    lat: -3.721668,
    lng: -38.520174,
    faixaPreco: null,
    tempoVisitaMin: 90,
    relevancia: 5,
    arLivre: false,
    horario: { abre: '09:00', fecha: '21:00', fonte: 'suposto' },
    foto: {
      url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0b/Centro_Drag%C3%A3o_do_Mar_de_Arte_e_Cultura_%284%29.jpg/500px-Centro_Drag%C3%A3o_do_Mar_de_Arte_e_Cultura_%284%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
      credito: 'Foto: Governo Federal Brasileiro · CC BY-SA 3.0 · Wikimedia Commons',
      fonte:
        'https://commons.wikimedia.org/wiki/File:Centro_Drag%C3%A3o_do_Mar_de_Arte_e_Cultura_(4).jpg',
    },
    fonte: 'osm:relation/5626526',
  },
  {
    id: 'fz-praia-iracema',
    cidadeId: 'fortaleza',
    nome: 'Praia de Iracema',
    categoria: 'natureza',
    endereco: 'Aterro da Praia de Iracema, Fortaleza - CE',
    lat: -3.722111,
    lng: -38.506656,
    faixaPreco: null,
    tempoVisitaMin: 60,
    relevancia: 5,
    arLivre: true,
    horario: null,
    foto: {
      url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/Praia_de_Iracema_em_Fortaleza_02.jpg/500px-Praia_de_Iracema_em_Fortaleza_02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
      credito: 'Foto: Keijuu · CC BY-SA 4.0 · Wikimedia Commons',
      fonte: 'https://commons.wikimedia.org/wiki/File:Praia_de_Iracema_em_Fortaleza_02.jpg',
    },
    fonte: 'osm:node/12568301419',
  },
  {
    id: 'fz-catedral',
    cidadeId: 'fortaleza',
    nome: 'Catedral Metropolitana',
    categoria: 'religioso',
    endereco: 'Rua Sena Madureira, Centro, Fortaleza - CE',
    lat: -3.724745,
    lng: -38.524379,
    faixaPreco: null,
    tempoVisitaMin: 30,
    relevancia: 4,
    arLivre: false,
    horario: { abre: '07:00', fecha: '18:00', fonte: 'suposto' },
    foto: {
      url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7d/Mar2024._Catedral_Metropolitana_de_Fortaleza.jpg/500px-Mar2024._Catedral_Metropolitana_de_Fortaleza.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
      credito: 'Foto: Ridiculopathy · CC0 · Wikimedia Commons',
      fonte:
        'https://commons.wikimedia.org/wiki/File:Mar2024._Catedral_Metropolitana_de_Fortaleza.jpg',
    },
    fonte: 'osm:way/1170435911',
  },
  {
    id: 'fz-theatro-jose-alencar',
    cidadeId: 'fortaleza',
    nome: 'Theatro José de Alencar',
    categoria: 'cultura',
    endereco: 'Rua Liberato Barroso, 525, Centro, Fortaleza - CE',
    lat: -3.727786,
    lng: -38.531706,
    faixaPreco: null,
    tempoVisitaMin: 60,
    relevancia: 4,
    arLivre: false,
    horario: { abre: '09:00', fecha: '18:00', fonte: 'osm' },
    foto: {
      url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/86/Theatro_Jos%C3%A9_de_Alencar_em_Fortaleza_03.jpg/500px-Theatro_Jos%C3%A9_de_Alencar_em_Fortaleza_03.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
      credito: 'Foto: GLandovsky · CC BY-SA 4.0 · Wikimedia Commons',
      fonte:
        'https://commons.wikimedia.org/wiki/File:Theatro_Jos%C3%A9_de_Alencar_em_Fortaleza_03.jpg',
    },
    fonte: 'osm:relation/15829061',
    observacao: 'No mapa: terça a sexta das 9h às 18h; fim de semana das 14h às 19h.',
  },
  {
    id: 'fz-parque-coco',
    cidadeId: 'fortaleza',
    nome: 'Parque do Cocó',
    categoria: 'natureza',
    endereco: 'Entrada do Parque do Cocó, Cocó, Fortaleza - CE',
    lat: -3.744497,
    lng: -38.487478,
    faixaPreco: null,
    tempoVisitaMin: 75,
    relevancia: 3,
    arLivre: true,
    horario: { abre: '05:30', fecha: '17:45', fonte: 'osm' },
    foto: {
      url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/Trilha_Principal_Parque_Estadual_do_Coc%C3%B3_1.jpg/500px-Trilha_Principal_Parque_Estadual_do_Coc%C3%B3_1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
      credito: 'Foto: Ruan moreira · CC BY-SA 4.0 · Wikimedia Commons',
      fonte:
        'https://commons.wikimedia.org/wiki/File:Trilha_Principal_Parque_Estadual_do_Coc%C3%B3_1.jpg',
    },
    fonte: 'osm:node/5982251843',
  },
  {
    id: 'fz-feirinha-beira-mar',
    cidadeId: 'fortaleza',
    nome: 'Feirinha da Beira-Mar',
    categoria: 'compras',
    endereco: 'Calçadão da Beira Mar, Meireles, Fortaleza - CE',
    lat: -3.725264,
    lng: -38.496478,
    faixaPreco: 2,
    tempoVisitaMin: 45,
    relevancia: 4,
    arLivre: false,
    horario: { abre: '16:00', fecha: '22:00', fonte: 'osm' },
    foto: {
      url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/JADEQUEIROZ_FEIRINHA_BEIRA_MAR_FORTALEZA_%2827780922188%29.jpg/500px-JADEQUEIROZ_FEIRINHA_BEIRA_MAR_FORTALEZA_%2827780922188%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
      credito: 'Foto: MTur Destinos · domínio público · Wikimedia Commons',
      fonte:
        'https://commons.wikimedia.org/wiki/File:JADEQUEIROZ_FEIRINHA_BEIRA_MAR_FORTALEZA_(27780922188).jpg',
    },
    fonte: 'osm:node/8042618634',
  },
  {
    id: 'fz-mercado-dos-peixes',
    cidadeId: 'fortaleza',
    nome: 'Mercado dos Peixes',
    categoria: 'gastronomia',
    endereco: 'Avenida Beira Mar, 3998, Mucuripe, Fortaleza - CE',
    lat: -3.721576,
    lng: -38.479746,
    faixaPreco: 2,
    tempoVisitaMin: 60,
    relevancia: 3,
    arLivre: false,
    horario: { abre: '06:00', fecha: '22:00', fonte: 'osm' },
    foto: {
      url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Mercado_dos_Peixes_de_Fortaleza_03.jpg/500px-Mercado_dos_Peixes_de_Fortaleza_03.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
      credito: 'Foto: Joelkaula · CC BY-SA 4.0 · Wikimedia Commons',
      fonte: 'https://commons.wikimedia.org/wiki/File:Mercado_dos_Peixes_de_Fortaleza_03.jpg',
    },
    fonte: 'osm:way/509654793',
  },
  {
    id: 'fz-centro-das-tapioqueiras',
    cidadeId: 'fortaleza',
    nome: 'Centro das Tapioqueiras',
    categoria: 'gastronomia',
    endereco: 'Avenida Washington Soares, 10215, Coaçu, Fortaleza - CE',
    lat: -3.840443,
    lng: -38.479317,
    faixaPreco: 1,
    tempoVisitaMin: 45,
    relevancia: 3,
    arLivre: false,
    horario: { abre: '06:30', fecha: '23:00', fonte: 'osm' },
    foto: null,
    fonte: 'osm:way/242892565',
  },
];

/** "08:30" em minutos desde a meia-noite. */
export function emMinutos(hora: string): number {
  const [h = 0, m = 0] = hora.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Janela de funcionamento em minutos, do jeito que o motor usa. Lugar ao ar
 * livre e lugar sem horário ficam sem janela (sempre abertos).
 */
export function janelaDoPonto(ponto: PontoDados): {
  abreMin: number | null;
  fechaMin: number | null;
} {
  if (ponto.arLivre || !ponto.horario) return { abreMin: null, fechaMin: null };
  return { abreMin: emMinutos(ponto.horario.abre), fechaMin: emMinutos(ponto.horario.fecha) };
}
