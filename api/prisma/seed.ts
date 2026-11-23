/**
 * Carga inicial do banco: cidades, tarifas e pontos de interesse.
 *
 * Os dados ficam em prisma/dados/index.ts, a fonte única que o modo de
 * demonstração do aplicativo também lê. Aqui só se grava: mudar um ponto,
 * uma foto ou um horário é mudar lá.
 *
 * A carga pode rodar de novo a qualquer momento: atualiza o que mudou, não
 * apaga roteiros e desativa (sem apagar) o ponto que saiu da lista.
 */

// O seed roda fora do servidor, então carrega o .env por conta própria.
// No CI a DATABASE_URL já vem do ambiente e isto não muda nada.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

import { CIDADES, PONTOS, TARIFAS, janelaDoPonto } from './dados/index.js';

const prisma = new PrismaClient();

/** Início da vigência das tarifas provisórias. */
const VIGENCIA_DAS_TARIFAS = new Date('2026-01-01T00:00:00Z');

async function main() {
  for (const cidade of CIDADES) {
    await prisma.cidade.upsert({ where: { id: cidade.id }, create: cidade, update: cidade });
  }

  // Tarifa já em vigor fica: o histórico precisa ser preservado para que
  // roteiros antigos continuem auditáveis.
  for (const tarifa of TARIFAS) {
    const jaExiste = await prisma.tarifaTaxi.findFirst({
      where: { cidadeId: tarifa.cidadeId, vigenciaFim: null },
    });
    if (jaExiste) continue;
    await prisma.tarifaTaxi.create({ data: { ...tarifa, vigenciaInicio: VIGENCIA_DAS_TARIFAS } });
  }

  for (const ponto of PONTOS) {
    const registro = {
      id: ponto.id,
      cidadeId: ponto.cidadeId,
      nome: ponto.nome,
      categoria: ponto.categoria,
      endereco: ponto.endereco,
      lat: ponto.lat,
      lng: ponto.lng,
      // O OpenStreetMap não traz avaliações.
      nota: null,
      avaliacoes: 0,
      faixaPreco: ponto.faixaPreco,
      tempoVisitaMin: ponto.tempoVisitaMin,
      ...janelaDoPonto(ponto),
      arLivre: ponto.arLivre,
      relevancia: ponto.relevancia,
      fotoUrl: ponto.foto?.url ?? null,
      fotoCredito: ponto.foto?.credito ?? null,
      fotoFonte: ponto.foto?.fonte ?? null,
      fonte: ponto.fonte,
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
    (ponto) => ponto.horario?.fonte === 'suposto' && !ponto.arLivre,
  ).length;
  const semFoto = PONTOS.filter((ponto) => !ponto.foto).map((ponto) => ponto.nome);

  console.log(
    `Carga concluída: ${cidades} cidades, ${tarifas} tarifas e ${pontos} pontos de interesse ativos.`,
  );
  if (desativados > 0) {
    console.log(`Pontos que saíram da lista e foram desativados: ${desativados}.`);
  }
  console.log(`Horários ainda supostos, a confirmar: ${horariosSupostos} de ${PONTOS.length}.`);
  if (semFoto.length > 0) console.log(`Sem foto livre: ${semFoto.join(', ')}.`);
}

main()
  .catch((erro) => {
    console.error('Falha na carga inicial:', erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
