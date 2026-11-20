/**
 * Carga inicial do banco.
 *
 * Traz as duas cidades do recorte do trabalho, suas tarifas e os pontos de
 * interesse.
 *
 * PONTOS: nome, coordenada e endereço vêm do OpenStreetMap (© colaboradores
 * do OpenStreetMap, licença ODbL), conferidos em 11/11/2026. O campo `fonte`
 * guarda o elemento de origem. A coordenada é a do ponto de chegada (a
 * entrada, o início da trilha), e não a do centro do lugar: é para onde a
 * rota precisa levar.
 *
 * O que ainda é suposição:
 *  - horário com `horarioFonte: 'suposto'`: janela típica do tipo de lugar,
 *    a confirmar. Com 'osm', veio do mapa, na janela dos dias úteis;
 *  - tempo de visita e faixa de preço: estimativas do autor;
 *  - nota e avaliações: nenhum ponto tem, porque o OpenStreetMap não traz
 *    avaliações. O aplicativo não mostra estrelas, e a escolha das paradas
 *    usa a relevância (curadoria) com a nota neutra para todos.
 *
 * TARIFAS: as tarifas abaixo são PROVISÓRIAS. Precisam ser trocadas pelos
 * valores dos decretos municipais de Quixadá e Fortaleza, e o campo `norma`
 * precisa citar a norma de origem — é o que torna a estimativa auditável.
 */

// O seed roda fora do servidor, então carrega o .env por conta própria.
// No CI a DATABASE_URL já vem do ambiente e isto não muda nada.
import 'dotenv/config';
import { PrismaClient, type CategoriaPOI } from '@prisma/client';

const prisma = new PrismaClient();

const hora = (texto: string) => {
  const [h, m] = texto.split(':').map(Number);
  return h! * 60 + (m ?? 0);
};

interface PontoSemente {
  id: string;
  cidadeId: string;
  nome: string;
  categoria: CategoriaPOI;
  endereco: string;
  /** Ponto de chegada: a entrada ou o início da trilha. */
  lat: number;
  lng: number;
  nota: number | null;
  avaliacoes: number;
  faixaPreco: number | null;
  tempoVisitaMin: number;
  abre?: string;
  fecha?: string;
  /** De onde veio o horário; ausente quando o lugar não tem horário. */
  horarioFonte?: 'osm' | 'suposto';
  /** Elemento do OpenStreetMap de onde vieram nome e coordenada. */
  fonte: string;
}

const CIDADES = [
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

const TARIFAS = [
  {
    cidadeId: 'quixada',
    bandeirada: 5.0,
    kmBandeira1: 3.0,
    kmBandeira2: 3.6,
    horaParada: 28.0,
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
    horaParada: 30.0,
    alfa: 0.82,
    alfaP10: 0.68,
    alfaP90: 1.1,
    norma: 'PROVISÓRIO - substituir pelo decreto municipal de Fortaleza',
  },
];

const PONTOS: PontoSemente[] = [
  // ------------------------------------------------------------- Quixadá
  // O Açude do Cedro e a trilha da Galinha Choca ficam lado a lado: quem
  // chega de carro para junto dos galpões e segue a pé.
  {
    id: 'qx-acude-cedro',
    cidadeId: 'quixada',
    nome: 'Açude do Cedro',
    categoria: 'natureza',
    endereco: 'Açude do Cedro, Quixadá - CE',
    lat: -4.980879,
    lng: -39.063945,
    nota: null,
    avaliacoes: 0,
    faixaPreco: null,
    tempoVisitaMin: 60,
    abre: '06:00',
    fecha: '17:30',
    horarioFonte: 'suposto',
    fonte: 'osm:node/4663218625',
  },
  {
    id: 'qx-galinha-choca',
    cidadeId: 'quixada',
    nome: 'Pedra da Galinha Choca',
    categoria: 'natureza',
    endereco: 'Trilha da Galinha Choca, Açude do Cedro, Quixadá - CE',
    lat: -4.980313,
    lng: -39.064697,
    nota: null,
    avaliacoes: 0,
    faixaPreco: null,
    tempoVisitaMin: 60,
    abre: '06:00',
    fecha: '17:30',
    horarioFonte: 'suposto',
    fonte: 'osm:node/4663218620',
  },
  {
    id: 'qx-pedra-cruzeiro',
    cidadeId: 'quixada',
    nome: 'Pedra do Cruzeiro',
    categoria: 'natureza',
    endereco: 'Avenida Plácido Castelo, Herval, Quixadá - CE',
    lat: -4.968082,
    lng: -39.016203,
    nota: null,
    avaliacoes: 0,
    faixaPreco: null,
    tempoVisitaMin: 45,
    abre: '06:00',
    fecha: '17:30',
    horarioFonte: 'suposto',
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
    nota: null,
    avaliacoes: 0,
    faixaPreco: null,
    tempoVisitaMin: 30,
    abre: '08:00',
    fecha: '17:00',
    horarioFonte: 'suposto',
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
    nota: null,
    avaliacoes: 0,
    faixaPreco: null,
    tempoVisitaMin: 45,
    abre: '08:00',
    fecha: '17:00',
    horarioFonte: 'suposto',
    fonte: 'osm:node/4670214870',
  },
  // No mapa o nome está grafado "Alderado"; o do poeta é Aderaldo.
  {
    id: 'qx-memorial-cego-aderaldo',
    cidadeId: 'quixada',
    nome: 'Memorial Cego Aderaldo',
    categoria: 'cultura',
    endereco: 'Rua Pascoal Crispino, Sitiá Oeste, Quixadá - CE',
    lat: -4.970161,
    lng: -39.015271,
    nota: null,
    avaliacoes: 0,
    faixaPreco: null,
    tempoVisitaMin: 30,
    abre: '08:00',
    fecha: '17:00',
    horarioFonte: 'suposto',
    fonte: 'osm:way/645475040',
  },
  {
    id: 'qx-catedral',
    cidadeId: 'quixada',
    nome: 'Catedral de Quixadá',
    categoria: 'religioso',
    endereco: 'Avenida Doutor Arcelino de Queiroz Lima, Herval, Quixadá - CE',
    lat: -4.967164,
    lng: -39.016913,
    nota: null,
    avaliacoes: 0,
    faixaPreco: null,
    tempoVisitaMin: 20,
    abre: '07:00',
    fecha: '19:00',
    horarioFonte: 'suposto',
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
    nota: null,
    avaliacoes: 0,
    faixaPreco: null,
    tempoVisitaMin: 60,
    abre: '07:00',
    fecha: '17:00',
    horarioFonte: 'suposto',
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
    nota: null,
    avaliacoes: 0,
    faixaPreco: 1,
    tempoVisitaMin: 30,
    abre: '06:00',
    fecha: '17:00',
    horarioFonte: 'suposto',
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
    nota: null,
    avaliacoes: 0,
    faixaPreco: 2,
    tempoVisitaMin: 60,
    abre: '09:30',
    fecha: '15:30',
    horarioFonte: 'osm',
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
    nota: null,
    avaliacoes: 0,
    faixaPreco: 1,
    tempoVisitaMin: 30,
    abre: '12:00',
    fecha: '23:00',
    horarioFonte: 'osm',
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
    nota: null,
    avaliacoes: 0,
    faixaPreco: 2,
    tempoVisitaMin: 60,
    abre: '11:00',
    fecha: '15:00',
    horarioFonte: 'suposto',
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
    nota: null,
    avaliacoes: 0,
    faixaPreco: 2,
    tempoVisitaMin: 60,
    abre: '11:00',
    fecha: '15:00',
    horarioFonte: 'suposto',
    fonte: 'osm:node/2638422688',
  },

  // ----------------------------------------------------------- Fortaleza
  {
    id: 'fz-mercado-central',
    cidadeId: 'fortaleza',
    nome: 'Mercado Central',
    categoria: 'compras',
    endereco: 'Avenida Alberto Nepomuceno, 199, Centro, Fortaleza - CE',
    lat: -3.723429,
    lng: -38.52395,
    nota: null,
    avaliacoes: 0,
    faixaPreco: 2,
    tempoVisitaMin: 60,
    abre: '08:00',
    fecha: '18:00',
    horarioFonte: 'osm',
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
    nota: null,
    avaliacoes: 0,
    faixaPreco: null,
    tempoVisitaMin: 90,
    abre: '09:00',
    fecha: '21:00',
    horarioFonte: 'suposto',
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
    nota: null,
    avaliacoes: 0,
    faixaPreco: null,
    tempoVisitaMin: 60,
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
    nota: null,
    avaliacoes: 0,
    faixaPreco: null,
    tempoVisitaMin: 30,
    abre: '07:00',
    fecha: '18:00',
    horarioFonte: 'suposto',
    fonte: 'osm:way/1170435911',
  },
  // No mapa: terça a sexta das 9h às 18h; fim de semana das 14h às 19h.
  {
    id: 'fz-theatro-jose-alencar',
    cidadeId: 'fortaleza',
    nome: 'Theatro José de Alencar',
    categoria: 'cultura',
    endereco: 'Rua Liberato Barroso, 525, Centro, Fortaleza - CE',
    lat: -3.727786,
    lng: -38.531706,
    nota: null,
    avaliacoes: 0,
    faixaPreco: null,
    tempoVisitaMin: 60,
    abre: '09:00',
    fecha: '18:00',
    horarioFonte: 'osm',
    fonte: 'osm:relation/15829061',
  },
  {
    id: 'fz-parque-coco',
    cidadeId: 'fortaleza',
    nome: 'Parque do Cocó',
    categoria: 'natureza',
    endereco: 'Entrada do Parque do Cocó, Cocó, Fortaleza - CE',
    lat: -3.744497,
    lng: -38.487478,
    nota: null,
    avaliacoes: 0,
    faixaPreco: null,
    tempoVisitaMin: 75,
    abre: '05:30',
    fecha: '17:45',
    horarioFonte: 'osm',
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
    nota: null,
    avaliacoes: 0,
    faixaPreco: 2,
    tempoVisitaMin: 45,
    abre: '16:00',
    fecha: '22:00',
    horarioFonte: 'osm',
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
    nota: null,
    avaliacoes: 0,
    faixaPreco: 2,
    tempoVisitaMin: 60,
    abre: '06:00',
    fecha: '22:00',
    horarioFonte: 'osm',
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
    nota: null,
    avaliacoes: 0,
    faixaPreco: 1,
    tempoVisitaMin: 45,
    abre: '06:30',
    fecha: '23:00',
    horarioFonte: 'osm',
    fonte: 'osm:way/242892565',
  },
];

/**
 * Relevância de cada ponto, de 1 a 5, com o mesmo critério em todas as cidades:
 *   5  símbolo da cidade: quem não vê, não conheceu o lugar
 *   4  grande atrativo
 *   3  vale a visita
 *   2  complementar (uma refeição ou um passeio curto)
 *   1  só se sobrar tempo
 * É curadoria do autor, a validar com quem conhece cada cidade.
 */
const RELEVANCIA: Record<string, 1 | 2 | 3 | 4 | 5> = {
  // Quixadá
  'qx-galinha-choca': 5,
  'qx-acude-cedro': 5,
  'qx-pedra-cruzeiro': 4,
  'qx-santuario-rainha-sertao': 4,
  'qx-catedral': 3,
  'qx-memorial-cego-aderaldo': 3,
  'qx-museu-jacinto-sousa': 3,
  'qx-mercado-publico': 3,
  'qx-chale-da-pedra': 3,
  'qx-peixada-abelardo': 3,
  'qx-sabores-do-sertao': 2,
  'qx-itajuba': 2,
  'qx-maria-pitanga': 2,
  // Fortaleza
  'fz-praia-iracema': 5,
  'fz-dragao-do-mar': 5,
  'fz-theatro-jose-alencar': 4,
  'fz-mercado-central': 4,
  'fz-catedral': 4,
  'fz-feirinha-beira-mar': 4,
  'fz-parque-coco': 3,
  'fz-mercado-dos-peixes': 3,
  'fz-centro-das-tapioqueiras': 3,
};

/**
 * Lugares públicos ao ar livre: parques, praças, praias, mirantes e trilhas.
 * Nunca ficam fora do horário no roteiro, então o horário deles não é
 * carregado. O Parque do Cocó tem portões (05:30 às 17:45 no OpenStreetMap),
 * mas por decisão do projeto entra como os demais.
 */
const AR_LIVRE = new Set([
  'qx-acude-cedro',
  'qx-galinha-choca',
  'qx-pedra-cruzeiro',
  'fz-praia-iracema',
  'fz-parque-coco',
]);

/**
 * Fotos reais, todas do Wikimedia Commons com licença livre (domínio público,
 * CC0, CC BY ou CC BY-SA), conferidas uma a uma. O crédito vai junto da foto
 * no aplicativo, como as licenças pedem. Ponto que não está aqui não tem foto
 * livre conhecida e aparece sem imagem.
 */
const FOTOS: Record<string, { url: string; credito: string; fonte: string }> = {
  'qx-acude-cedro': {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/aa/A%C3%A7ude_Cedro_-_Cart%C3%A3o_postal_do_Cear%C3%A1.jpg/500px-A%C3%A7ude_Cedro_-_Cart%C3%A3o_postal_do_Cear%C3%A1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    credito: 'Foto: GLandovsky · CC BY-SA 4.0 · Wikimedia Commons',
    fonte:
      'https://commons.wikimedia.org/wiki/File:A%C3%A7ude_Cedro_-_Cart%C3%A3o_postal_do_Cear%C3%A1.jpg',
  },
  'qx-galinha-choca': {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2d/Pedra_da_Galinha_Choca.jpg/500px-Pedra_da_Galinha_Choca.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    credito: 'Foto: Krewinkel-Terto de Amorim · domínio público · Wikimedia Commons',
    fonte: 'https://commons.wikimedia.org/wiki/File:Pedra_da_Galinha_Choca.jpg',
  },
  'qx-pedra-cruzeiro': {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d9/Pedra_do_cruzeiro_-_quixada_ce.JPG/500px-Pedra_do_cruzeiro_-_quixada_ce.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    credito: 'Foto: Fábio Barros · CC BY 2.5 · Wikimedia Commons',
    fonte: 'https://commons.wikimedia.org/wiki/File:Pedra_do_cruzeiro_-_quixada_ce.JPG',
  },
  'qx-chale-da-pedra': {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/40/Chale_da_pedra_quixada_ce.JPG/500px-Chale_da_pedra_quixada_ce.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    credito: 'Foto: domínio público · Wikimedia Commons',
    fonte: 'https://commons.wikimedia.org/wiki/File:Chale_da_pedra_quixada_ce.JPG',
  },
  'qx-museu-jacinto-sousa': {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/Museu_historico_jacinto_de_sousa.JPG/500px-Museu_historico_jacinto_de_sousa.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    credito: 'Foto: Fábio Barros · domínio público · Wikimedia Commons',
    fonte: 'https://commons.wikimedia.org/wiki/File:Museu_historico_jacinto_de_sousa.JPG',
  },
  'qx-memorial-cego-aderaldo': {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Monumento_cego_aderaldo_quixada_CE.JPG/500px-Monumento_cego_aderaldo_quixada_CE.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    credito: 'Foto: Fábio Barros · CC BY-SA 2.5 · Wikimedia Commons',
    fonte: 'https://commons.wikimedia.org/wiki/File:Monumento_cego_aderaldo_quixada_CE.JPG',
  },
  'qx-catedral': {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Catedral_Quixad%C3%A1.jpg/500px-Catedral_Quixad%C3%A1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    credito: 'Foto: GLandovsky · CC BY 4.0 · Wikimedia Commons',
    fonte: 'https://commons.wikimedia.org/wiki/File:Catedral_Quixad%C3%A1.jpg',
  },
  'qx-santuario-rainha-sertao': {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Quixad%C3%A1_CE_Brasil_-_Santu%C3%A1rio_Rainha_do_Sert%C3%A3o_-_panoramio.jpg/500px-Quixad%C3%A1_CE_Brasil_-_Santu%C3%A1rio_Rainha_do_Sert%C3%A3o_-_panoramio.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    credito: 'Foto: Jorge Colares · CC BY-SA 3.0 · Wikimedia Commons',
    fonte:
      'https://commons.wikimedia.org/wiki/File:Quixad%C3%A1_CE_Brasil_-_Santu%C3%A1rio_Rainha_do_Sert%C3%A3o_-_panoramio.jpg',
  },
  'fz-mercado-central': {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/Mar2024._Mercado_Central_de_Fortaleza%2C_Cear%C3%A1%2C_Brazil_01.jpg/500px-Mar2024._Mercado_Central_de_Fortaleza%2C_Cear%C3%A1%2C_Brazil_01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    credito: 'Foto: Ridiculopathy · CC0 · Wikimedia Commons',
    fonte:
      'https://commons.wikimedia.org/wiki/File:Mar2024._Mercado_Central_de_Fortaleza,_Cear%C3%A1,_Brazil_01.jpg',
  },
  'fz-dragao-do-mar': {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0b/Centro_Drag%C3%A3o_do_Mar_de_Arte_e_Cultura_%284%29.jpg/500px-Centro_Drag%C3%A3o_do_Mar_de_Arte_e_Cultura_%284%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    credito: 'Foto: Governo Federal Brasileiro · CC BY-SA 3.0 · Wikimedia Commons',
    fonte:
      'https://commons.wikimedia.org/wiki/File:Centro_Drag%C3%A3o_do_Mar_de_Arte_e_Cultura_(4).jpg',
  },
  'fz-praia-iracema': {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/Praia_de_Iracema_em_Fortaleza_02.jpg/500px-Praia_de_Iracema_em_Fortaleza_02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    credito: 'Foto: Keijuu · CC BY-SA 4.0 · Wikimedia Commons',
    fonte: 'https://commons.wikimedia.org/wiki/File:Praia_de_Iracema_em_Fortaleza_02.jpg',
  },
  'fz-catedral': {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7d/Mar2024._Catedral_Metropolitana_de_Fortaleza.jpg/500px-Mar2024._Catedral_Metropolitana_de_Fortaleza.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    credito: 'Foto: Ridiculopathy · CC0 · Wikimedia Commons',
    fonte:
      'https://commons.wikimedia.org/wiki/File:Mar2024._Catedral_Metropolitana_de_Fortaleza.jpg',
  },
  'fz-theatro-jose-alencar': {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/86/Theatro_Jos%C3%A9_de_Alencar_em_Fortaleza_03.jpg/500px-Theatro_Jos%C3%A9_de_Alencar_em_Fortaleza_03.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    credito: 'Foto: GLandovsky · CC BY-SA 4.0 · Wikimedia Commons',
    fonte:
      'https://commons.wikimedia.org/wiki/File:Theatro_Jos%C3%A9_de_Alencar_em_Fortaleza_03.jpg',
  },
  'fz-parque-coco': {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/Trilha_Principal_Parque_Estadual_do_Coc%C3%B3_1.jpg/500px-Trilha_Principal_Parque_Estadual_do_Coc%C3%B3_1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    credito: 'Foto: Ruan moreira · CC BY-SA 4.0 · Wikimedia Commons',
    fonte:
      'https://commons.wikimedia.org/wiki/File:Trilha_Principal_Parque_Estadual_do_Coc%C3%B3_1.jpg',
  },
  'fz-feirinha-beira-mar': {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/JADEQUEIROZ_FEIRINHA_BEIRA_MAR_FORTALEZA_%2827780922188%29.jpg/500px-JADEQUEIROZ_FEIRINHA_BEIRA_MAR_FORTALEZA_%2827780922188%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    credito: 'Foto: MTur Destinos · domínio público · Wikimedia Commons',
    fonte:
      'https://commons.wikimedia.org/wiki/File:JADEQUEIROZ_FEIRINHA_BEIRA_MAR_FORTALEZA_(27780922188).jpg',
  },
  'fz-mercado-dos-peixes': {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Mercado_dos_Peixes_de_Fortaleza_03.jpg/500px-Mercado_dos_Peixes_de_Fortaleza_03.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    credito: 'Foto: Joelkaula · CC BY-SA 4.0 · Wikimedia Commons',
    fonte: 'https://commons.wikimedia.org/wiki/File:Mercado_dos_Peixes_de_Fortaleza_03.jpg',
  },
};

async function main() {
  const semRelevancia = PONTOS.filter((ponto) => !(ponto.id in RELEVANCIA));
  if (semRelevancia.length > 0) {
    throw new Error(`Faltou a relevância de: ${semRelevancia.map((p) => p.id).join(', ')}`);
  }

  for (const cidade of CIDADES) {
    await prisma.cidade.upsert({
      where: { id: cidade.id },
      create: cidade,
      update: cidade,
    });
  }

  // Encerra a vigência anterior antes de inserir a tarifa atual: o histórico
  // precisa ser preservado para que roteiros antigos continuem auditáveis.
  for (const tarifa of TARIFAS) {
    const jaExiste = await prisma.tarifaTaxi.findFirst({
      where: { cidadeId: tarifa.cidadeId, vigenciaFim: null },
    });
    if (jaExiste) continue;

    await prisma.tarifaTaxi.create({
      data: { ...tarifa, vigenciaInicio: new Date('2026-01-01T00:00:00Z') },
    });
  }

  for (const ponto of PONTOS) {
    // `horarioFonte` documenta a carga e não vai para o banco.
    const { abre, fecha, horarioFonte: _horarioFonte, ...dados } = ponto;
    const arLivre = AR_LIVRE.has(ponto.id);
    const registro = {
      ...dados,
      abreMin: abre && !arLivre ? hora(abre) : null,
      fechaMin: fecha && !arLivre ? hora(fecha) : null,
      arLivre,
      fotoUrl: FOTOS[ponto.id]?.url ?? null,
      fotoCredito: FOTOS[ponto.id]?.credito ?? null,
      fotoFonte: FOTOS[ponto.id]?.fonte ?? null,
      relevancia: RELEVANCIA[ponto.id]!,
      ativo: true,
      sincronizadoEm: new Date(),
    };

    await prisma.pontoInteresse.upsert({
      where: { id: ponto.id },
      create: registro,
      update: registro,
    });
  }

  // Ponto que saiu da lista não é apagado: roteiros antigos passaram por ele.
  // Ele só deixa de entrar em roteiro novo.
  const { count: desativados } = await prisma.pontoInteresse.updateMany({
    where: {
      cidadeId: { in: CIDADES.map((cidade) => cidade.id) },
      id: { notIn: PONTOS.map((ponto) => ponto.id) },
      ativo: true,
    },
    data: { ativo: false },
  });

  const [cidades, tarifas, pontos] = await Promise.all([
    prisma.cidade.count(),
    prisma.tarifaTaxi.count(),
    prisma.pontoInteresse.count({ where: { ativo: true } }),
  ]);
  const horariosSupostos = PONTOS.filter(
    (ponto) => ponto.horarioFonte === 'suposto' && !AR_LIVRE.has(ponto.id),
  ).length;

  console.log(
    `Carga concluída: ${cidades} cidades, ${tarifas} tarifas e ${pontos} pontos de interesse ativos.`,
  );
  if (desativados > 0)
    console.log(`Pontos que saíram da lista e foram desativados: ${desativados}.`);
  console.log(`Horários ainda supostos, a confirmar: ${horariosSupostos} de ${PONTOS.length}.`);
  const semFoto = PONTOS.filter((ponto) => !FOTOS[ponto.id]).map((ponto) => ponto.nome);
  if (semFoto.length > 0) console.log(`Sem foto livre: ${semFoto.join(', ')}.`);
}

main()
  .catch((erro) => {
    console.error('Falha na carga inicial:', erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
