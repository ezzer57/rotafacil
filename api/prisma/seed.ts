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
 *  - nota e avaliações: fictícias nos pontos que já existiam. Ponto novo
 *    entra sem nota, e o algoritmo o trata pela média dos demais.
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
  { id: 'qx-acude-cedro', cidadeId: 'quixada', nome: 'Açude do Cedro', categoria: 'natureza', endereco: 'Açude do Cedro, Quixadá - CE', lat: -4.980879, lng: -39.063945, nota: 4.6, avaliacoes: 870, faixaPreco: null, tempoVisitaMin: 60, abre: '06:00', fecha: '17:30', horarioFonte: 'suposto', fonte: 'osm:node/4663218625' },
  { id: 'qx-galinha-choca', cidadeId: 'quixada', nome: 'Pedra da Galinha Choca', categoria: 'natureza', endereco: 'Trilha da Galinha Choca, Açude do Cedro, Quixadá - CE', lat: -4.980313, lng: -39.064697, nota: 4.8, avaliacoes: 1240, faixaPreco: null, tempoVisitaMin: 60, abre: '06:00', fecha: '17:30', horarioFonte: 'suposto', fonte: 'osm:node/4663218620' },
  { id: 'qx-pedra-cruzeiro', cidadeId: 'quixada', nome: 'Pedra do Cruzeiro', categoria: 'natureza', endereco: 'Avenida Plácido Castelo, Herval, Quixadá - CE', lat: -4.968082, lng: -39.016203, nota: null, avaliacoes: 0, faixaPreco: null, tempoVisitaMin: 45, abre: '06:00', fecha: '17:30', horarioFonte: 'suposto', fonte: 'osm:node/4663218683' },
  { id: 'qx-chale-da-pedra', cidadeId: 'quixada', nome: 'Chalé da Pedra', categoria: 'cultura', endereco: 'Rua Oscar Barbosa, Baviera, Quixadá - CE', lat: -4.971541, lng: -39.014195, nota: null, avaliacoes: 0, faixaPreco: null, tempoVisitaMin: 30, abre: '08:00', fecha: '17:00', horarioFonte: 'suposto', fonte: 'osm:way/438218757' },
  { id: 'qx-museu-jacinto-sousa', cidadeId: 'quixada', nome: 'Museu Histórico Jacinto de Sousa', categoria: 'cultura', endereco: 'Rua Autran Moreno, Baviera, Quixadá - CE', lat: -4.96944, lng: -39.012282, nota: null, avaliacoes: 0, faixaPreco: null, tempoVisitaMin: 45, abre: '08:00', fecha: '17:00', horarioFonte: 'suposto', fonte: 'osm:node/4670214870' },
  // No mapa o nome está grafado "Alderado"; o do poeta é Aderaldo.
  { id: 'qx-memorial-cego-aderaldo', cidadeId: 'quixada', nome: 'Memorial Cego Aderaldo', categoria: 'cultura', endereco: 'Rua Pascoal Crispino, Sitiá Oeste, Quixadá - CE', lat: -4.970161, lng: -39.015271, nota: null, avaliacoes: 0, faixaPreco: null, tempoVisitaMin: 30, abre: '08:00', fecha: '17:00', horarioFonte: 'suposto', fonte: 'osm:way/645475040' },
  { id: 'qx-catedral', cidadeId: 'quixada', nome: 'Catedral de Quixadá', categoria: 'religioso', endereco: 'Avenida Doutor Arcelino de Queiroz Lima, Herval, Quixadá - CE', lat: -4.967164, lng: -39.016913, nota: null, avaliacoes: 0, faixaPreco: null, tempoVisitaMin: 20, abre: '07:00', fecha: '19:00', horarioFonte: 'suposto', fonte: 'osm:way/1181239160' },
  { id: 'qx-santuario-rainha-sertao', cidadeId: 'quixada', nome: 'Santuário Rainha do Sertão', categoria: 'religioso', endereco: 'Serra do Urucum, Quixadá - CE', lat: -5.038487, lng: -39.009256, nota: null, avaliacoes: 0, faixaPreco: null, tempoVisitaMin: 60, abre: '07:00', fecha: '17:00', horarioFonte: 'suposto', fonte: 'osm:way/438218565' },
  { id: 'qx-mercado-publico', cidadeId: 'quixada', nome: 'Mercado Público Municipal', categoria: 'compras', endereco: 'Travessa Leovigildo Barreto, Herval, Quixadá - CE', lat: -4.969671, lng: -39.017092, nota: null, avaliacoes: 0, faixaPreco: 1, tempoVisitaMin: 30, abre: '06:00', fecha: '17:00', horarioFonte: 'suposto', fonte: 'osm:way/388454618' },
  { id: 'qx-sabores-do-sertao', cidadeId: 'quixada', nome: 'Sabores do Sertão', categoria: 'gastronomia', endereco: 'Avenida Plácido Castelo, Herval, Quixadá - CE', lat: -4.968914, lng: -39.015988, nota: null, avaliacoes: 0, faixaPreco: 2, tempoVisitaMin: 60, abre: '09:30', fecha: '15:30', horarioFonte: 'osm', fonte: 'osm:way/394341880' },
  { id: 'qx-maria-pitanga', cidadeId: 'quixada', nome: 'Maria Pitanga Açaiteria', categoria: 'gastronomia', endereco: 'Rua Basilio Emiliano Pinto, 309, Combate, Quixadá - CE', lat: -4.970145, lng: -39.018402, nota: null, avaliacoes: 0, faixaPreco: 1, tempoVisitaMin: 30, abre: '12:00', fecha: '23:00', horarioFonte: 'osm', fonte: 'osm:node/4781914521' },
  { id: 'qx-peixada-abelardo', cidadeId: 'quixada', nome: 'Peixada O Abelardo', categoria: 'gastronomia', endereco: 'Avenida Plácido Castelo, Triângulo, Quixadá - CE', lat: -4.962965, lng: -39.015442, nota: null, avaliacoes: 0, faixaPreco: 2, tempoVisitaMin: 60, abre: '11:00', fecha: '15:00', horarioFonte: 'suposto', fonte: 'osm:node/4663218654' },
  { id: 'qx-itajuba', cidadeId: 'quixada', nome: 'Itajubá', categoria: 'gastronomia', endereco: 'Avenida Francisco Pinheiro de Almeida, Planalto Universitário, Quixadá - CE', lat: -4.96289, lng: -39.024273, nota: null, avaliacoes: 0, faixaPreco: 2, tempoVisitaMin: 60, abre: '11:00', fecha: '15:00', horarioFonte: 'suposto', fonte: 'osm:node/2638422688' },

  // ----------------------------------------------------------- Fortaleza
  { id: 'fz-mercado-central', cidadeId: 'fortaleza', nome: 'Mercado Central', categoria: 'compras', endereco: 'Avenida Alberto Nepomuceno, 199, Centro, Fortaleza - CE', lat: -3.723429, lng: -38.52395, nota: 4.5, avaliacoes: 48200, faixaPreco: 2, tempoVisitaMin: 60, abre: '08:00', fecha: '18:00', horarioFonte: 'osm', fonte: 'osm:way/24395456' },
  { id: 'fz-dragao-do-mar', cidadeId: 'fortaleza', nome: 'Centro Dragão do Mar', categoria: 'cultura', endereco: 'Rua Dragão do Mar, 81, Praia de Iracema, Fortaleza - CE', lat: -3.721668, lng: -38.520174, nota: 4.7, avaliacoes: 32100, faixaPreco: null, tempoVisitaMin: 90, abre: '09:00', fecha: '21:00', horarioFonte: 'suposto', fonte: 'osm:relation/5626526' },
  { id: 'fz-praia-iracema', cidadeId: 'fortaleza', nome: 'Praia de Iracema', categoria: 'natureza', endereco: 'Aterro da Praia de Iracema, Fortaleza - CE', lat: -3.722111, lng: -38.506656, nota: 4.4, avaliacoes: 21500, faixaPreco: null, tempoVisitaMin: 60, fonte: 'osm:node/12568301419' },
  { id: 'fz-catedral', cidadeId: 'fortaleza', nome: 'Catedral Metropolitana', categoria: 'religioso', endereco: 'Rua Sena Madureira, Centro, Fortaleza - CE', lat: -3.724745, lng: -38.524379, nota: 4.6, avaliacoes: 12800, faixaPreco: null, tempoVisitaMin: 30, abre: '07:00', fecha: '18:00', horarioFonte: 'suposto', fonte: 'osm:way/1170435911' },
  // No mapa: terça a sexta das 9h às 18h; fim de semana das 14h às 19h.
  { id: 'fz-theatro-jose-alencar', cidadeId: 'fortaleza', nome: 'Theatro José de Alencar', categoria: 'cultura', endereco: 'Rua Liberato Barroso, 525, Centro, Fortaleza - CE', lat: -3.727786, lng: -38.531706, nota: 4.7, avaliacoes: 9400, faixaPreco: null, tempoVisitaMin: 60, abre: '09:00', fecha: '18:00', horarioFonte: 'osm', fonte: 'osm:relation/15829061' },
  { id: 'fz-parque-coco', cidadeId: 'fortaleza', nome: 'Parque do Cocó', categoria: 'natureza', endereco: 'Entrada do Parque do Cocó, Cocó, Fortaleza - CE', lat: -3.744497, lng: -38.487478, nota: 4.6, avaliacoes: 15600, faixaPreco: null, tempoVisitaMin: 75, abre: '05:30', fecha: '17:45', horarioFonte: 'osm', fonte: 'osm:node/5982251843' },
  { id: 'fz-feirinha-beira-mar', cidadeId: 'fortaleza', nome: 'Feirinha da Beira-Mar', categoria: 'compras', endereco: 'Calçadão da Beira Mar, Meireles, Fortaleza - CE', lat: -3.725264, lng: -38.496478, nota: 4.3, avaliacoes: 18900, faixaPreco: 2, tempoVisitaMin: 45, abre: '16:00', fecha: '22:00', horarioFonte: 'osm', fonte: 'osm:node/8042618634' },
  { id: 'fz-mercado-dos-peixes', cidadeId: 'fortaleza', nome: 'Mercado dos Peixes', categoria: 'gastronomia', endereco: 'Avenida Beira Mar, 3998, Mucuripe, Fortaleza - CE', lat: -3.721576, lng: -38.479746, nota: null, avaliacoes: 0, faixaPreco: 2, tempoVisitaMin: 60, abre: '06:00', fecha: '22:00', horarioFonte: 'osm', fonte: 'osm:way/509654793' },
  { id: 'fz-centro-das-tapioqueiras', cidadeId: 'fortaleza', nome: 'Centro das Tapioqueiras', categoria: 'gastronomia', endereco: 'Avenida Washington Soares, 10215, Coaçu, Fortaleza - CE', lat: -3.840443, lng: -38.479317, nota: null, avaliacoes: 0, faixaPreco: 1, tempoVisitaMin: 45, abre: '06:30', fecha: '23:00', horarioFonte: 'osm', fonte: 'osm:way/242892565' },
];

async function main() {
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
    const registro = {
      ...dados,
      abreMin: abre ? hora(abre) : null,
      fechaMin: fecha ? hora(fecha) : null,
      fotoUrl: `https://picsum.photos/seed/${ponto.id}/800/600`,
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
  const horariosSupostos = PONTOS.filter((ponto) => ponto.horarioFonte === 'suposto').length;

  console.log(
    `Carga concluída: ${cidades} cidades, ${tarifas} tarifas e ${pontos} pontos de interesse ativos.`,
  );
  if (desativados > 0) console.log(`Pontos que saíram da lista e foram desativados: ${desativados}.`);
  console.log(`Horários ainda supostos, a confirmar: ${horariosSupostos} de ${PONTOS.length}.`);
}

main()
  .catch((erro) => {
    console.error('Falha na carga inicial:', erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
