/**
 * Testes do motor de roteirização.
 *
 * Cobrem o comportamento que sustenta as hipóteses do trabalho: respeitar o
 * orçamento quando há teto, continuar pesando o custo quando não há,
 * respeitar o tempo e o horário de funcionamento e explicar o que foi
 * descartado.
 */

import { describe, expect, it } from 'vitest';

import {
  cabeNaJanela,
  custoNoLocal,
  situacaoNoHorario,
  beneficio,
  gerarRoteiro,
  pontuar,
  type Candidato,
  type Preferencias,
} from './roteirizacao.js';
import type { ParametrosTarifa } from './tarifa.js';

const TARIFA: ParametrosTarifa = {
  bandeirada: 5.5,
  kmBandeira1: 3.2,
  kmBandeira2: 3.9,
  horaParada: 30,
  alfa: 0.82,
  alfaP10: 0.68,
  alfaP90: 1.1,
  norma: 'Tarifa de teste',
};

const CENTRO = { lat: -4.9712, lng: -39.0156 };

function candidato(parcial: Partial<Candidato> & { id: string }): Candidato {
  return {
    nome: `Ponto ${parcial.id}`,
    categoria: 'cultura',
    coordenada: CENTRO,
    nota: 4.5,
    avaliacoes: 500,
    faixaPreco: null,
    tempoVisitaMin: 30,
    relevancia: 3,
    arLivre: false,
    abreMin: null,
    fechaMin: null,
    ...parcial,
  };
}

/** Desloca uma coordenada alguns quilômetros para o norte. */
const aNorte = (km: number) => ({ lat: CENTRO.lat + km / 111.32, lng: CENTRO.lng });

const preferencias = (parcial: Partial<Preferencias> = {}): Preferencias => ({
  origem: CENTRO,
  categorias: [],
  orcamento: 100,
  tempoDisponivelMin: 240,
  inicioPrevisto: new Date('2026-10-21T09:00:00'),
  ...parcial,
});

describe('custoNoLocal', () => {
  it('converte a faixa de preço do provedor em reais', () => {
    expect(custoNoLocal(candidato({ id: 'a', faixaPreco: null }))).toBe(0);
    expect(custoNoLocal(candidato({ id: 'b', faixaPreco: 2 }))).toBe(45);
  });
});

describe('cabeNaJanela', () => {
  const museu = candidato({ id: 'museu', abreMin: 8 * 60, fechaMin: 17 * 60, tempoVisitaMin: 60 });

  it('aceita visita que começa e termina dentro do horário', () => {
    expect(cabeNaJanela(museu, new Date('2026-10-21T10:00:00'), 0)).toBe(true);
  });

  it('recusa chegada antes da abertura', () => {
    expect(cabeNaJanela(museu, new Date('2026-10-21T07:00:00'), 0)).toBe(false);
  });

  it('recusa visita que ultrapassaria o fechamento', () => {
    expect(cabeNaJanela(museu, new Date('2026-10-21T16:30:00'), 0)).toBe(false);
  });

  it('considera ponto sem horário como sempre aberto', () => {
    const praca = candidato({ id: 'praca' });
    expect(cabeNaJanela(praca, new Date('2026-10-21T03:00:00'), 0)).toBe(true);
  });

  it('considera lugar ao ar livre sempre aberto, mesmo com horário cadastrado', () => {
    const parque = candidato({ id: 'parque', arLivre: true, abreMin: 5 * 60, fechaMin: 18 * 60 });
    expect(cabeNaJanela(parque, new Date('2026-10-21T22:00:00'), 0)).toBe(true);
  });
});

describe('situacaoNoHorario', () => {
  const museu = candidato({ id: 'museu', abreMin: 8 * 60, fechaMin: 17 * 60, tempoVisitaMin: 60 });

  it('distingue aberto, fechado e fechando durante a visita', () => {
    expect(situacaoNoHorario(museu, new Date('2026-10-21T10:00:00'))).toBe('aberto');
    expect(situacaoNoHorario(museu, new Date('2026-10-21T07:30:00'))).toBe('fechado');
    expect(situacaoNoHorario(museu, new Date('2026-10-21T22:00:00'))).toBe('fechado');
    expect(situacaoNoHorario(museu, new Date('2026-10-21T16:30:00'))).toBe(
      'fecha-durante-a-visita',
    );
  });

  it('lugar ao ar livre nunca fica fora do horário', () => {
    const praia = candidato({ id: 'praia', arLivre: true, abreMin: 6 * 60, fechaMin: 18 * 60 });
    expect(situacaoNoHorario(praia, new Date('2026-10-21T23:30:00'))).toBe('aberto');
  });

  it('entende janela que vira o dia: um bar das 18h às 2h', () => {
    const bar = candidato({ id: 'bar', abreMin: 18 * 60, fechaMin: 2 * 60, tempoVisitaMin: 60 });

    expect(situacaoNoHorario(bar, new Date('2026-10-21T17:00:00'))).toBe('fechado');
    expect(situacaoNoHorario(bar, new Date('2026-10-21T23:00:00'))).toBe('aberto');
    expect(situacaoNoHorario(bar, new Date('2026-10-22T00:30:00'))).toBe('aberto');
    expect(situacaoNoHorario(bar, new Date('2026-10-22T01:30:00'))).toBe('fecha-durante-a-visita');
    expect(situacaoNoHorario(bar, new Date('2026-10-22T03:00:00'))).toBe('fechado');
  });

  it('visita longa que começa à noite fecha na madrugada seguinte, e não no mesmo dia', () => {
    const bar = candidato({
      id: 'bar',
      abreMin: 18 * 60,
      fechaMin: 2 * 60,
      tempoVisitaMin: 5 * 60,
    });
    // Das 22h às 3h passa das 2h; das 20h à 1h, não.
    expect(situacaoNoHorario(bar, new Date('2026-10-21T22:00:00'))).toBe('fecha-durante-a-visita');
    expect(situacaoNoHorario(bar, new Date('2026-10-21T20:00:00'))).toBe('aberto');
  });

  it('fechamento à meia-noite vale gravado como 0h ou como 24h', () => {
    const comoZero = candidato({ id: 'a', abreMin: 18 * 60, fechaMin: 0, tempoVisitaMin: 30 });
    const comoVinteEQuatro = candidato({
      id: 'b',
      abreMin: 18 * 60,
      fechaMin: 24 * 60,
      tempoVisitaMin: 30,
    });

    for (const lugar of [comoZero, comoVinteEQuatro]) {
      expect(situacaoNoHorario(lugar, new Date('2026-10-21T23:00:00'))).toBe('aberto');
      expect(situacaoNoHorario(lugar, new Date('2026-10-21T23:45:00'))).toBe(
        'fecha-durante-a-visita',
      );
      expect(situacaoNoHorario(lugar, new Date('2026-10-22T00:30:00'))).toBe('fechado');
    }
  });

  it('abertura igual ao fechamento é lugar aberto 24 horas', () => {
    const posto = candidato({ id: 'posto', abreMin: 0, fechaMin: 0, tempoVisitaMin: 60 });
    expect(situacaoNoHorario(posto, new Date('2026-10-21T03:00:00'))).toBe('aberto');
    expect(situacaoNoHorario(posto, new Date('2026-10-21T23:30:00'))).toBe('aberto');
  });
});

describe('pontuar', () => {
  const semNota = { nota: null, avaliacoes: 0 };

  it('dá a um ponto sem nota a média dos que têm', () => {
    const universo = [
      candidato({ id: 'a', nota: 5, avaliacoes: 100 }),
      candidato({ id: 'b', nota: 4, avaliacoes: 100 }),
      candidato({ id: 'novo', ...semNota }),
    ];

    expect(pontuar(universo[2]!, universo, 1)).toBeCloseTo(4.5);
  });

  it('não deixa a falta de nota de uns derrubar a pontuação dos outros', () => {
    const avaliados = [
      candidato({ id: 'a', nota: 5, avaliacoes: 100 }),
      candidato({ id: 'b', nota: 4, avaliacoes: 100 }),
    ];
    const comNovos = [
      ...avaliados,
      candidato({ id: 'n1', ...semNota }),
      candidato({ id: 'n2', ...semNota }),
      candidato({ id: 'n3', ...semNota }),
    ];

    expect(pontuar(avaliados[0]!, comNovos, 1)).toBeCloseTo(pontuar(avaliados[0]!, avaliados, 1));
  });

  it('trata todos por igual quando ninguém tem nota', () => {
    const universo = [candidato({ id: 'x', ...semNota }), candidato({ id: 'y', ...semNota })];

    const x = pontuar(universo[0]!, universo, 1);
    expect(x).toBeGreaterThan(0);
    expect(pontuar(universo[1]!, universo, 1)).toBe(x);
  });
});

describe('gerarRoteiro', () => {
  it('sem nota em nenhum ponto, começa pelo que consome menos', () => {
    const candidatos = [
      candidato({ id: 'longe', coordenada: aNorte(6), nota: null, avaliacoes: 0 }),
      candidato({ id: 'perto', coordenada: aNorte(0.5), nota: null, avaliacoes: 0 }),
    ];

    const resultado = gerarRoteiro(candidatos, preferencias(), TARIFA);

    expect(resultado.itens[0]?.candidato.id).toBe('perto');
  });

  it('não ultrapassa o orçamento informado', () => {
    const candidatos = [3, 6, 9, 12].map((km, i) =>
      candidato({ id: `p${i}`, coordenada: aNorte(km) }),
    );

    const resultado = gerarRoteiro(candidatos, preferencias({ orcamento: 30 }), TARIFA);
    const total = resultado.totais.custoTransporte.estimado + resultado.totais.custoLocais;

    expect(total).toBeLessThanOrEqual(30);
  });

  it('não ultrapassa o tempo disponível', () => {
    const candidatos = [2, 4, 6, 8].map((km, i) =>
      candidato({ id: `p${i}`, coordenada: aNorte(km), tempoVisitaMin: 60 }),
    );

    const resultado = gerarRoteiro(candidatos, preferencias({ tempoDisponivelMin: 120 }), TARIFA);

    expect(resultado.totais.duracaoMin).toBeLessThanOrEqual(120);
  });

  it('aumenta o número de paradas quando o orçamento cresce', () => {
    const candidatos = [3, 6, 9, 12, 15].map((km, i) =>
      candidato({ id: `p${i}`, coordenada: aNorte(km) }),
    );

    const pobre = gerarRoteiro(candidatos, preferencias({ orcamento: 25 }), TARIFA);
    const rico = gerarRoteiro(candidatos, preferencias({ orcamento: 300 }), TARIFA);

    expect(rico.itens.length).toBeGreaterThan(pobre.itens.length);
  });

  it('sem teto de gasto, não descarta nenhum ponto por orçamento', () => {
    const candidatos = [3, 6, 9, 12].map((km, i) =>
      candidato({ id: `p${i}`, coordenada: aNorte(km) }),
    );

    const comTeto = gerarRoteiro(candidatos, preferencias({ orcamento: 30 }), TARIFA);
    const semTeto = gerarRoteiro(candidatos, preferencias({ orcamento: null }), TARIFA);

    expect(semTeto.itens.length).toBeGreaterThan(comTeto.itens.length);
    expect(semTeto.descartados.some((d) => d.motivo === 'orcamento')).toBe(false);
  });

  it('sem teto de gasto, o custo continua pesando na escolha', () => {
    // Mesma nota e mesma visita: um ponto perto o bastante para ir a pé e
    // outro mais rápido de alcançar de carro, mas pago. Se o custo saísse da
    // conta, o de carro ganharia por consumir menos tempo.
    const candidatos = [
      candidato({ id: 'a-pe', coordenada: aNorte(0.7) }),
      candidato({ id: 'de-carro', coordenada: aNorte(2) }),
    ];

    // Só um dos dois cabe no tempo, então a escolha é só de custo.
    const resultado = gerarRoteiro(
      candidatos,
      preferencias({ orcamento: null, tempoDisponivelMin: 50 }),
      TARIFA,
    );

    expect(resultado.itens.map((i) => i.candidato.id)).toEqual(['a-pe']);
  });

  it('explica o motivo de cada ponto descartado', () => {
    const candidatos = [
      candidato({ id: 'perto', coordenada: aNorte(0.5) }),
      candidato({ id: 'caro', coordenada: aNorte(40) }),
    ];

    const resultado = gerarRoteiro(candidatos, preferencias({ orcamento: 20 }), TARIFA);
    const descartado = resultado.descartados.find((d) => d.candidato.id === 'caro');

    expect(descartado?.motivo).toBe('orcamento');
    expect(descartado?.detalhe).toMatch(/faltariam R\$/);
  });

  it('não descarta o lugar fechado: ele entra no roteiro marcado como fechado', () => {
    const candidatos = [
      candidato({
        id: 'museu',
        coordenada: aNorte(0.3),
        abreMin: 8 * 60,
        fechaMin: 17 * 60,
      }),
    ];

    const resultado = gerarRoteiro(
      candidatos,
      preferencias({ inicioPrevisto: new Date('2026-10-21T22:00:00') }),
      TARIFA,
    );

    expect(resultado.itens.map((i) => [i.candidato.id, i.situacaoNoHorario])).toEqual([
      ['museu', 'fechado'],
    ]);
    expect(resultado.descartados).toHaveLength(0);
  });

  it('prefere o lugar aberto ao fechado quando só cabe um', () => {
    const candidatos = [
      candidato({
        id: 'fechado',
        relevancia: 5,
        coordenada: aNorte(0.3),
        abreMin: 14 * 60,
        fechaMin: 18 * 60,
      }),
      candidato({ id: 'aberto', relevancia: 3, coordenada: aNorte(0.3) }),
    ];

    const resultado = gerarRoteiro(
      candidatos,
      preferencias({ orcamento: null, tempoDisponivelMin: 45 }),
      TARIFA,
    );

    expect(resultado.itens.map((i) => i.candidato.id)).toEqual(['aberto']);
    // O fechado fica de fora por falta de tempo, não pelo horário.
    expect(resultado.descartados[0]?.motivo).toBe('tempo');
  });

  it('usa caminhada, sem custo, em trechos curtos', () => {
    const candidatos = [candidato({ id: 'vizinho', coordenada: aNorte(0.4) })];

    const resultado = gerarRoteiro(candidatos, preferencias(), TARIFA);

    expect(resultado.itens[0]?.trechoAteAqui.modal).toBe('pe');
    expect(resultado.itens[0]?.trechoAteAqui.custo.estimado).toBe(0);
    expect(resultado.totais.trechosAPe).toBe(1);
    expect(resultado.totais.economiaCaminhando).toBeGreaterThan(0);
  });

  it('prefere pontos das categorias escolhidas pelo usuário', () => {
    const candidatos = [
      candidato({ id: 'museu', categoria: 'cultura', coordenada: aNorte(5) }),
      candidato({ id: 'restaurante', categoria: 'gastronomia', coordenada: aNorte(5.05) }),
    ];

    const resultado = gerarRoteiro(
      candidatos,
      // Tempo para um só: a escolha é de preferência, não de ordem.
      preferencias({ categorias: ['gastronomia'], orcamento: 40, tempoDisponivelMin: 60 }),
      TARIFA,
    );

    expect(resultado.itens.map((i) => i.candidato.id)).toEqual(['restaurante']);
  });

  it('devolve roteiro vazio, e não erro, quando nada cabe', () => {
    const candidatos = [candidato({ id: 'longe', coordenada: aNorte(50) })];

    const resultado = gerarRoteiro(candidatos, preferencias({ orcamento: 5 }), TARIFA);

    expect(resultado.itens).toHaveLength(0);
    expect(resultado.descartados).toHaveLength(1);
    expect(resultado.totais.custoTransporte.estimado).toBe(0);
  });

  it('mantém os horários da sequência coerentes entre si', () => {
    const candidatos = [3, 6, 9].map((km, i) =>
      candidato({ id: `p${i}`, coordenada: aNorte(km), tempoVisitaMin: 30 }),
    );

    const resultado = gerarRoteiro(candidatos, preferencias({ orcamento: 500 }), TARIFA);

    for (let i = 1; i < resultado.itens.length; i++) {
      const anterior = resultado.itens[i - 1]!;
      const atual = resultado.itens[i]!;
      expect(atual.chegadaPrevista.getTime()).toBeGreaterThanOrEqual(
        anterior.saidaPrevista.getTime(),
      );
    }
  });

  it('informa as métricas de processamento', () => {
    const candidatos = [1, 2, 3].map((km, i) => candidato({ id: `p${i}`, coordenada: aNorte(km) }));

    const resultado = gerarRoteiro(candidatos, preferencias(), TARIFA);

    expect(resultado.diagnostico.candidatosAvaliados).toBe(3);
    expect(resultado.diagnostico.trechosCalculados).toBeGreaterThan(0);
    expect(resultado.diagnostico.duracaoMs).toBeGreaterThanOrEqual(0);
  });
});

describe('beneficio', () => {
  it('a relevância separa pontos sem nota: o cartão-postal vale mais que o complementar', () => {
    const universo = [
      candidato({ id: 'postal', relevancia: 5, nota: null, avaliacoes: 0 }),
      candidato({ id: 'cafe', relevancia: 2, nota: null, avaliacoes: 0 }),
    ];
    expect(beneficio(universo[0]!, universo, 1)).toBeGreaterThan(
      beneficio(universo[1]!, universo, 1),
    );
  });

  it('a nota desempata pontos de mesma relevância', () => {
    const universo = [
      candidato({ id: 'bom', relevancia: 3, nota: 4.8, avaliacoes: 900 }),
      candidato({ id: 'ruim', relevancia: 3, nota: 3.2, avaliacoes: 900 }),
    ];
    expect(beneficio(universo[0]!, universo, 1)).toBeGreaterThan(
      beneficio(universo[1]!, universo, 1),
    );
  });

  it('a preferência de categoria multiplica o benefício', () => {
    const universo = [candidato({ id: 'a', relevancia: 4 })];
    expect(beneficio(universo[0]!, universo, 0.25)).toBeCloseTo(
      beneficio(universo[0]!, universo, 1) / 4,
    );
  });
});

describe('gerarRoteiro: relevância e ordem das paradas', () => {
  it('com tempo para só um ponto, escolhe o mais relevante mesmo estando mais longe', () => {
    const candidatos = [
      candidato({
        id: 'complementar',
        relevancia: 2,
        coordenada: aNorte(0.3),
        nota: null,
        avaliacoes: 0,
      }),
      candidato({
        id: 'simbolo',
        relevancia: 5,
        coordenada: aNorte(0.9),
        nota: null,
        avaliacoes: 0,
      }),
    ];
    const resultado = gerarRoteiro(
      candidatos,
      preferencias({ orcamento: null, tempoDisponivelMin: 50 }),
      TARIFA,
    );
    expect(resultado.itens.map((i) => i.candidato.id)).toEqual(['simbolo']);
  });

  it('desfaz o zigue-zague: visita em fila, e não indo e voltando', () => {
    // Três pontos em linha para o norte. A inserção gulosa pode começar pelo
    // do meio ou pelo mais relevante; a ordem final tem de ser a da fila.
    const candidatos = [
      candidato({ id: 'p3', relevancia: 5, coordenada: aNorte(0.9) }),
      candidato({ id: 'p1', relevancia: 3, coordenada: aNorte(0.3) }),
      candidato({ id: 'p2', relevancia: 4, coordenada: aNorte(0.6) }),
    ];
    const resultado = gerarRoteiro(candidatos, preferencias({ orcamento: null }), TARIFA);

    expect(resultado.itens.map((i) => i.candidato.id)).toEqual(['p1', 'p2', 'p3']);
  });

  it('a ordem final nunca é mais demorada que a da inserção gulosa', () => {
    const candidatos = [
      candidato({ id: 'a', relevancia: 5, coordenada: aNorte(0.8) }),
      candidato({
        id: 'b',
        relevancia: 4,
        coordenada: { lat: CENTRO.lat, lng: CENTRO.lng + 0.008 },
      }),
      candidato({ id: 'c', relevancia: 3, coordenada: aNorte(0.4) }),
      candidato({
        id: 'd',
        relevancia: 3,
        coordenada: { lat: CENTRO.lat, lng: CENTRO.lng - 0.006 },
      }),
    ];
    const resultado = gerarRoteiro(
      candidatos,
      preferencias({ orcamento: null, tempoDisponivelMin: 480 }),
      TARIFA,
    );

    const deslocamento = resultado.itens.reduce((s, i) => s + i.trechoAteAqui.duracaoMin, 0);
    // Cota simples: nenhum percurso razoável de 4 pontos a menos de 1 km um do outro passa de 1 h.
    expect(deslocamento).toBeLessThan(60);
    expect(resultado.itens).toHaveLength(4);
  });

  it('não reordena para uma visita cair fora do horário, mesmo encurtando o caminho', () => {
    // O ponto mais perto só abre às 10h, e as visitas longas fazem a fila
    // chegar a ele já aberto. Visitá-lo primeiro, às 9h, encurtaria o caminho,
    // mas o deixaria fechado.
    const candidatos = [
      candidato({
        id: 'abre-tarde',
        relevancia: 5,
        coordenada: aNorte(0.2),
        abreMin: 10 * 60,
        fechaMin: 18 * 60,
      }),
      candidato({ id: 'longe', relevancia: 5, coordenada: aNorte(0.9), tempoVisitaMin: 40 }),
      candidato({ id: 'meio', relevancia: 5, coordenada: aNorte(0.5), tempoVisitaMin: 40 }),
    ];
    const resultado = gerarRoteiro(
      candidatos,
      preferencias({ orcamento: null, tempoDisponivelMin: 480 }),
      TARIFA,
    );

    expect(resultado.itens).toHaveLength(3);
    expect(resultado.itens.every((i) => i.situacaoNoHorario === 'aberto')).toBe(true);
  });

  it('marca a situação de cada parada de acordo com a hora prevista de chegada', () => {
    const candidatos = [
      candidato({
        id: 'abre-tarde',
        relevancia: 5,
        coordenada: aNorte(0.2),
        abreMin: 11 * 60,
        fechaMin: 18 * 60,
      }),
      candidato({ id: 'longe', relevancia: 5, coordenada: aNorte(0.9) }),
      candidato({ id: 'meio', relevancia: 5, coordenada: aNorte(0.5) }),
    ];
    const resultado = gerarRoteiro(
      candidatos,
      preferencias({ orcamento: null, tempoDisponivelMin: 480 }),
      TARIFA,
    );

    for (const item of resultado.itens) {
      expect(item.situacaoNoHorario).toBe(situacaoNoHorario(item.candidato, item.chegadaPrevista));
    }
  });
});

describe('gerarRoteiro: horário do dia', () => {
  it('roteiro que passa da meia-noite encontra o bar aberto na madrugada', () => {
    const bar = candidato({
      id: 'bar',
      categoria: 'vidaNoturna',
      relevancia: 5,
      coordenada: aNorte(0.3),
      abreMin: 18 * 60,
      fechaMin: 2 * 60,
    });
    const resultado = gerarRoteiro(
      [bar],
      preferencias({ inicioPrevisto: new Date('2026-10-21T23:58:00'), orcamento: null }),
      TARIFA,
    );

    const parada = resultado.itens[0]!;
    expect(parada.candidato.id).toBe('bar');
    expect(parada.chegadaPrevista.getDate()).toBe(22);
    expect(parada.situacaoNoHorario).toBe('aberto');
  });

  it('à noite, o parque com horário no mapa ganha do museu fechado', () => {
    const parque = candidato({
      id: 'parque',
      relevancia: 5,
      arLivre: true,
      coordenada: aNorte(0.3),
      abreMin: 6 * 60,
      fechaMin: 17 * 60 + 30,
      tempoVisitaMin: 40,
    });
    const museu = candidato({
      id: 'museu',
      relevancia: 5,
      coordenada: aNorte(-0.3),
      abreMin: 8 * 60,
      fechaMin: 17 * 60,
      tempoVisitaMin: 40,
    });
    // Uma hora só dá para um dos dois.
    const resultado = gerarRoteiro(
      [museu, parque],
      preferencias({
        inicioPrevisto: new Date('2026-10-21T21:00:00'),
        tempoDisponivelMin: 60,
        orcamento: null,
      }),
      TARIFA,
    );

    expect(resultado.itens.map((i) => i.candidato.id)).toEqual(['parque']);
    expect(resultado.itens[0]!.situacaoNoHorario).toBe('aberto');
  });

  it('a economia de caminhar usa a bandeira da hora: vale mais à noite e no domingo', () => {
    const praca = candidato({ id: 'praca', coordenada: aNorte(0.3) });
    const economiaAs = (inicio: string) =>
      gerarRoteiro(
        [praca],
        preferencias({ inicioPrevisto: new Date(inicio), orcamento: null }),
        TARIFA,
      ).totais.economiaCaminhando;

    const diaUtil = economiaAs('2026-10-21T10:00:00');
    expect(diaUtil).toBeGreaterThan(0);
    expect(economiaAs('2026-10-21T23:00:00')).toBeGreaterThan(diaUtil);
    expect(economiaAs('2026-10-25T10:00:00')).toBeGreaterThan(diaUtil);
  });
});

describe('gerarRoteiro: memória de trechos', () => {
  const candidatos = [
    candidato({ id: 'a', coordenada: aNorte(0.2) }),
    candidato({ id: 'b', coordenada: aNorte(0.5) }),
    candidato({ id: 'c', coordenada: aNorte(0.9) }),
  ];

  it('mede cada par de pontos uma vez só, por mais ordens que simule', () => {
    const { itens, diagnostico } = gerarRoteiro(
      candidatos,
      preferencias({ orcamento: null }),
      TARIFA,
    );

    expect(itens).toHaveLength(3);
    // Da origem para 3 pontos, e de cada ponto para os outros 2: 9 pares, todos
    // de manhã num dia útil (uma bandeira só).
    expect(diagnostico.trechosCalculados).toBeLessThanOrEqual(9);
  });

  it('devolve o mesmo roteiro para a mesma entrada', () => {
    const gerar = () =>
      gerarRoteiro(candidatos, preferencias({ orcamento: null }), TARIFA).itens.map((i) => [
        i.candidato.id,
        i.chegadaPrevista.toISOString(),
      ]);
    expect(gerar()).toEqual(gerar());
  });
});
