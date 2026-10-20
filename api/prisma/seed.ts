/**
 * Carga inicial do banco.
 *
 * Traz as duas cidades do recorte do trabalho, suas tarifas e os pontos de
 * interesse usados enquanto a Places API não entra.
 *
 * ATENÇÃO: as tarifas abaixo são PROVISÓRIAS. Precisam ser trocadas pelos
 * valores dos decretos municipais de Quixadá e Fortaleza, e o campo `norma`
 * precisa citar a norma de origem — é o que torna a estimativa auditável.
 *
 * As notas, avaliações e horários dos pontos são fictícios, e os
 * estabelecimentos de gastronomia também. Os atrativos turísticos são reais.
 */

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
  lat: number;
  lng: number;
  nota: number;
  avaliacoes: number;
  faixaPreco: number | null;
  tempoVisitaMin: number;
  abre?: string;
  fecha?: string;
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
  { id: 'qx-galinha-choca', cidadeId: 'quixada', nome: 'Pedra da Galinha Choca', categoria: 'natureza', endereco: 'Serra do Estevão, Quixadá - CE', lat: -4.9339, lng: -39.0131, nota: 4.8, avaliacoes: 1240, faixaPreco: null, tempoVisitaMin: 45 },
  { id: 'qx-acude-cedro', cidadeId: 'quixada', nome: 'Açude do Cedro', categoria: 'natureza', endereco: 'Zona rural, Quixadá - CE', lat: -4.9494, lng: -39.0247, nota: 4.6, avaliacoes: 870, faixaPreco: null, tempoVisitaMin: 60, abre: '08:00', fecha: '17:00' },
  { id: 'qx-monolitos', cidadeId: 'quixada', nome: 'Mirante dos Monólitos', categoria: 'natureza', endereco: 'Quixadá - CE', lat: -4.943, lng: -39.009, nota: 4.7, avaliacoes: 530, faixaPreco: null, tempoVisitaMin: 30, abre: '06:00', fecha: '18:00' },
  { id: 'qx-igreja-matriz', cidadeId: 'quixada', nome: 'Igreja Matriz de Santo Antônio', categoria: 'religioso', endereco: 'Centro, Quixadá - CE', lat: -4.9707, lng: -39.0151, nota: 4.5, avaliacoes: 410, faixaPreco: null, tempoVisitaMin: 20, abre: '07:00', fecha: '19:00' },
  { id: 'qx-restaurante-sertao', cidadeId: 'quixada', nome: 'Restaurante Sabor do Sertão', categoria: 'gastronomia', endereco: 'Centro, Quixadá - CE', lat: -4.9725, lng: -39.0168, nota: 4.4, avaliacoes: 320, faixaPreco: 2, tempoVisitaMin: 60, abre: '11:00', fecha: '15:00' },
  { id: 'qx-cafe-pedra', cidadeId: 'quixada', nome: 'Café da Pedra', categoria: 'gastronomia', endereco: 'Av. Plínio Pompeu, Quixadá - CE', lat: -4.9681, lng: -39.0132, nota: 4.6, avaliacoes: 180, faixaPreco: 1, tempoVisitaMin: 30, abre: '08:00', fecha: '22:00' },
  { id: 'qx-centro-cultural', cidadeId: 'quixada', nome: 'Centro Cultural de Quixadá', categoria: 'cultura', endereco: 'Centro, Quixadá - CE', lat: -4.9718, lng: -39.0174, nota: 4.3, avaliacoes: 150, faixaPreco: null, tempoVisitaMin: 45, abre: '08:00', fecha: '17:00' },

  // ----------------------------------------------------------- Fortaleza
  { id: 'fz-mercado-central', cidadeId: 'fortaleza', nome: 'Mercado Central', categoria: 'compras', endereco: 'Centro, Fortaleza - CE', lat: -3.7247, lng: -38.5312, nota: 4.5, avaliacoes: 48200, faixaPreco: 2, tempoVisitaMin: 60, abre: '08:00', fecha: '18:00' },
  { id: 'fz-dragao-do-mar', cidadeId: 'fortaleza', nome: 'Centro Dragão do Mar', categoria: 'cultura', endereco: 'Praia de Iracema, Fortaleza - CE', lat: -3.7221, lng: -38.5243, nota: 4.7, avaliacoes: 32100, faixaPreco: null, tempoVisitaMin: 90, abre: '09:00', fecha: '21:00' },
  { id: 'fz-praia-iracema', cidadeId: 'fortaleza', nome: 'Praia de Iracema', categoria: 'natureza', endereco: 'Praia de Iracema, Fortaleza - CE', lat: -3.7206, lng: -38.5131, nota: 4.4, avaliacoes: 21500, faixaPreco: null, tempoVisitaMin: 60 },
  { id: 'fz-catedral', cidadeId: 'fortaleza', nome: 'Catedral Metropolitana', categoria: 'religioso', endereco: 'Centro, Fortaleza - CE', lat: -3.7256, lng: -38.5296, nota: 4.6, avaliacoes: 12800, faixaPreco: null, tempoVisitaMin: 30, abre: '07:00', fecha: '18:00' },
  { id: 'fz-theatro-jose-alencar', cidadeId: 'fortaleza', nome: 'Theatro José de Alencar', categoria: 'cultura', endereco: 'Centro, Fortaleza - CE', lat: -3.7293, lng: -38.525, nota: 4.7, avaliacoes: 9400, faixaPreco: null, tempoVisitaMin: 60, abre: '08:00', fecha: '17:00' },
  { id: 'fz-parque-coco', cidadeId: 'fortaleza', nome: 'Parque do Cocó', categoria: 'natureza', endereco: 'Cocó, Fortaleza - CE', lat: -3.7586, lng: -38.4866, nota: 4.6, avaliacoes: 15600, faixaPreco: null, tempoVisitaMin: 75, abre: '06:00', fecha: '17:00' },
  { id: 'fz-restaurante-maresia', cidadeId: 'fortaleza', nome: 'Restaurante Maresia', categoria: 'gastronomia', endereco: 'Praia do Futuro, Fortaleza - CE', lat: -3.7417, lng: -38.454, nota: 4.5, avaliacoes: 5200, faixaPreco: 3, tempoVisitaMin: 75, abre: '11:00', fecha: '23:00' },
  { id: 'fz-feirinha-beira-mar', cidadeId: 'fortaleza', nome: 'Feirinha da Beira-Mar', categoria: 'compras', endereco: 'Meireles, Fortaleza - CE', lat: -3.7256, lng: -38.4958, nota: 4.3, avaliacoes: 18900, faixaPreco: 2, tempoVisitaMin: 45, abre: '16:00', fecha: '23:00' },
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
    const { abre, fecha, ...dados } = ponto;
    const registro = {
      ...dados,
      abreMin: abre ? hora(abre) : null,
      fechaMin: fecha ? hora(fecha) : null,
      fotoUrl: `https://picsum.photos/seed/${ponto.id}/800/600`,
    };

    await prisma.pontoInteresse.upsert({
      where: { id: ponto.id },
      create: registro,
      update: registro,
    });
  }

  const [cidades, tarifas, pontos] = await Promise.all([
    prisma.cidade.count(),
    prisma.tarifaTaxi.count(),
    prisma.pontoInteresse.count(),
  ]);

  console.log(
    `Carga concluída: ${cidades} cidades, ${tarifas} tarifas e ${pontos} pontos de interesse.`,
  );
}

main()
  .catch((erro) => {
    console.error('Falha na carga inicial:', erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
