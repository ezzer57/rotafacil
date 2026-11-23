/**
 * Serviço de roteiros: as regras de cada caso de uso.
 *
 * Para gerar ou recalcular um roteiro:
 * 1. carrega a tarifa e os pontos candidatos da cidade;
 * 2. mede as distâncias pelas ruas entre todos os pontos, numa consulta só;
 * 3. roda o motor (código puro, em src/core);
 * 4. traça as ruas dos trechos escolhidos, para o mapa;
 * 5. grava tudo numa transação.
 *
 * Num roteiro em andamento, as paradas em que a pessoa já chegou ficam como
 * estão, e só o resto é refeito (src/core/recalculo.ts): é assim no
 * "Recalcular daqui" e nos ajustes (tirar, trocar, mudar o teto).
 *
 * A rede (servidor de rotas) fica fora da transação, para o banco não ficar
 * preso esperando resposta. As consultas ficam em `repositorio.ts`, e a
 * tradução do resultado para as tabelas, em `gravacao.ts`.
 */

import { haversine, type Coordenada } from '@/core/geo.js';
import {
  orcamentoQueSobra,
  partidaDoAjuste,
  partidaDoRecalculo,
  partidaPropriaDoResto,
  refazerORestante,
} from '@/core/recalculo.js';
import type { Categoria, ItemRoteiro, Preferencias } from '@/core/roteirizacao.js';
import type { DadosGerarRoteiro, DadosRecalcularRoteiro } from '@/contratos/index.js';
import { naoEncontrado, regraDeNegocio } from '@/lib/erros.js';
import { clienteDeRotas, type Tracado } from '@/lib/rotas.js';
import { baseDoPlano, paradasFeitas, type FeitaGravada } from './em-andamento.js';
import { lerRecalculo, paraGravacao, type PedidoDeRoteiro } from './gravacao.js';
import * as repositorio from './repositorio.js';
import { serializarResumo, serializarRoteiro } from './serializador.js';

/**
 * Distância máxima entre o ponto de partida e o centro da cidade. É o mesmo
 * raio que o aplicativo usa para decidir se parte do GPS ou do centro: os
 * dois precisam concordar, senão o app manda uma posição que a API recusa.
 */
const RAIO_COBERTURA_CIDADE_KM = 60;

/** Recusa partida além do raio da cidade, com a mensagem de cada caso. */
function conferirRaio(
  origem: Coordenada,
  cidade: { nome: string; lat: number; lng: number },
  mensagem: (km: number, cidade: string) => string,
) {
  const distancia = haversine(origem, { lat: cidade.lat, lng: cidade.lng });
  if (distancia > RAIO_COBERTURA_CIDADE_KM) {
    throw regraDeNegocio(mensagem(Math.round(distancia), cidade.nome));
  }
}

const partidaLonge = (km: number, cidade: string) =>
  `O ponto de partida está a ${km} km de ${cidade}. Escolha partir do centro da cidade.`;

const recalculoLonge = (km: number, cidade: string) =>
  `Você está a ${km} km de ${cidade}. O "Recalcular daqui" só funciona perto da cidade do roteiro.`;

/** Ruas de cada parada, a partir da anterior; só o que foi medido pelas ruas. */
async function tracarTrechos(
  origem: Coordenada,
  itens: ItemRoteiro[],
): Promise<(Tracado | null)[]> {
  if (!clienteDeRotas) return itens.map(() => null);

  return clienteDeRotas.tracarVarios(
    itens.map((item, i) =>
      item.trechoAteAqui.fonte === 'ruas'
        ? {
            perfil: item.trechoAteAqui.modal === 'pe' ? 'pe' : 'carro',
            de: i === 0 ? origem : itens[i - 1]!.candidato.coordenada,
            para: item.candidato.coordenada,
          }
        : null,
    ),
  );
}

/** O que recalcular: o pedido a gravar, as paradas que ficam e o que falta planejar. */
interface Plano {
  pedido: PedidoDeRoteiro;
  feitas: FeitaGravada[];
  /** Partida, início, tempo e teto do que falta. */
  resto: Preferencias;
}

/** Executa o motor e grava o resultado, substituindo o roteiro quando é recálculo. */
async function calcularEGravar({ pedido, feitas, resto }: Plano, roteiroExistenteId?: string) {
  const tarifa = await repositorio.carregarTarifa(pedido.cidadeId);
  const visitados = feitas.map((f) => f.item.candidato.id);
  const candidatos = await repositorio.carregarCandidatos(pedido.cidadeId, [
    ...pedido.excluidos,
    ...visitados,
  ]);
  if (candidatos.length === 0 && feitas.length === 0) {
    throw regraDeNegocio('Esta cidade ainda não tem pontos turísticos cadastrados');
  }

  // Uma só consulta mede todos os pares de pontos; sem resposta, o motor usa
  // a estimativa em linha reta e o roteiro diz isso.
  const medidor =
    (await clienteDeRotas?.medirTudo([resto.origem, ...candidatos.map((c) => c.coordenada)])) ??
    undefined;

  const resultado = refazerORestante(feitas, candidatos, resto, tarifa, medidor);
  const novos = resultado.itens.slice(feitas.length);

  // As paradas feitas são regravadas como estavam, com as ruas já traçadas.
  const tracados = [...feitas.map((f) => f.trajeto), ...(await tracarTrechos(resto.origem, novos))];

  // O primeiro trecho novo sai da partida do resto, que só é guardada quando
  // não é o ponto anterior da lista (no "Recalcular daqui", a posição da pessoa).
  const partidaPropria = partidaPropriaDoResto(feitas, pedido.preferencias.origem, resto.origem);
  const partidas = [
    ...feitas.map((f) => f.partida),
    ...novos.map((_, i) => (i === 0 ? partidaPropria : null)),
  ];

  return repositorio.salvar(
    paraGravacao(pedido, resultado, tracados, partidas),
    roteiroExistenteId,
  );
}

/** O pedido original gravado, com o teto em vigor. */
function pedidoOriginal(atual: repositorio.RoteiroGravado): Preferencias {
  return {
    origem: { lat: atual.origemLat, lng: atual.origemLng },
    categorias: atual.categorias as Categoria[],
    orcamento: atual.orcamento == null ? null : Number(atual.orcamento),
    tempoDisponivelMin: atual.tempoDisponivelMin,
    inicioPrevisto: atual.inicioPrevisto,
  };
}

/* -------------------------------------------------------- casos de uso */

export async function gerar(usuarioId: string, entrada: DadosGerarRoteiro) {
  const cidade = await repositorio.resolverCidade(entrada.cidadeId, entrada.origem);
  conferirRaio(entrada.origem, cidade, partidaLonge);

  const preferencias: Preferencias = {
    origem: entrada.origem,
    categorias: entrada.categorias as Categoria[],
    orcamento: entrada.orcamento,
    tempoDisponivelMin: entrada.tempoDisponivelMin,
    inicioPrevisto: entrada.inicioPrevisto,
  };

  const roteiro = await calcularEGravar({
    pedido: { usuarioId, cidadeId: cidade.id, preferencias, excluidos: [] },
    feitas: [],
    resto: preferencias,
  });

  return serializarRoteiro(roteiro);
}

export async function obter(usuarioId: string, roteiroId: string) {
  return serializarRoteiro(await repositorio.carregarDoUsuario(roteiroId, usuarioId));
}

export async function listar(usuarioId: string, limite: number, pagina: number) {
  const { registros, total } = await repositorio.listarDoUsuario(usuarioId, limite, pagina);
  return { itens: registros.map(serializarResumo), total, pagina, limite };
}

/**
 * Remove ou troca um ponto, ou muda o teto de gasto (null tira o teto), e
 * refaz o que falta do roteiro. As paradas em que a pessoa já chegou ficam.
 */
export async function ajustar(
  usuarioId: string,
  roteiroId: string,
  operacao:
    | { tipo: 'remover' | 'substituir'; pontoId: string }
    | { tipo: 'orcamento'; valor: number | null },
) {
  const atual = await repositorio.carregarDoUsuario(roteiroId, usuarioId);
  const feitas = paradasFeitas(atual);

  if (
    operacao.tipo !== 'orcamento' &&
    feitas.some((f) => f.item.candidato.id === operacao.pontoId)
  ) {
    throw regraDeNegocio('Você já chegou nesta parada. Desfaça a chegada para tirá-la do roteiro');
  }

  const excluidos =
    operacao.tipo === 'orcamento'
      ? atual.pontosExcluidos
      : [...new Set([...atual.pontosExcluidos, operacao.pontoId])];

  const original = pedidoOriginal(atual);
  const teto = operacao.tipo === 'orcamento' ? operacao.valor : original.orcamento;
  const partida = partidaDoAjuste(baseDoPlano(atual), feitas);

  const roteiro = await calcularEGravar(
    {
      pedido: {
        usuarioId,
        cidadeId: atual.cidadeId,
        preferencias: { ...original, orcamento: teto },
        excluidos,
        recalculo: lerRecalculo(atual),
      },
      feitas,
      resto: {
        origem: partida.origem,
        categorias: original.categorias,
        orcamento: orcamentoQueSobra(teto, feitas),
        tempoDisponivelMin: partida.tempoDisponivelMin,
        inicioPrevisto: partida.inicio,
      },
    },
    atual.id,
  );

  return serializarRoteiro(roteiro);
}

/**
 * "Recalcular daqui": refaz o que falta do roteiro a partir de onde a pessoa
 * está, agora, com o tempo que ela diz ter e o que sobra do teto. Sem a
 * posição (GPS negado ou sem sinal), parte da última parada em que ela chegou.
 */
export async function recalcularDaqui(
  usuarioId: string,
  roteiroId: string,
  entrada: DadosRecalcularRoteiro,
) {
  const atual = await repositorio.carregarDoUsuario(roteiroId, usuarioId);
  if (entrada.origem) conferirRaio(entrada.origem, atual.cidade, recalculoLonge);

  const feitas = paradasFeitas(atual);
  const { origem, de } = partidaDoRecalculo(entrada.origem ?? null, baseDoPlano(atual), feitas);
  const agora = new Date();
  const original = pedidoOriginal(atual);

  const roteiro = await calcularEGravar(
    {
      pedido: {
        usuarioId,
        cidadeId: atual.cidadeId,
        preferencias: original,
        excluidos: atual.pontosExcluidos,
        recalculo: { em: agora, origem, tempoDisponivelMin: entrada.tempoDisponivelMin, de },
      },
      feitas,
      resto: {
        origem,
        categorias: original.categorias,
        orcamento: orcamentoQueSobra(original.orcamento, feitas),
        tempoDisponivelMin: entrada.tempoDisponivelMin,
        inicioPrevisto: agora,
      },
    },
    atual.id,
  );

  return serializarRoteiro(roteiro);
}

export async function registrarVisita(
  usuarioId: string,
  roteiroId: string,
  pontoId: string,
  custoRegistrado?: number,
) {
  const roteiro = await repositorio.carregarDoUsuario(roteiroId, usuarioId);
  if (!roteiro.itens.some((i) => i.pontoId === pontoId)) {
    throw regraDeNegocio('Este ponto não faz parte do roteiro');
  }

  const visita = await repositorio.registrarVisita(roteiroId, pontoId, custoRegistrado);
  return {
    id: visita.id,
    roteiroId: visita.roteiroId,
    pontoId: visita.pontoId,
    chegadaEm: visita.chegadaEm.toISOString(),
    custoRegistrado: visita.custoRegistrado == null ? null : Number(visita.custoRegistrado),
  };
}

/** Desfaz um check-in feito por engano: apaga a visita e desmarca a parada. */
export async function desfazerVisita(usuarioId: string, roteiroId: string, pontoId: string) {
  const roteiro = await repositorio.carregarDoUsuario(roteiroId, usuarioId);
  if (!roteiro.visitas.some((v) => v.pontoId === pontoId)) throw naoEncontrado('Check-in');
  await repositorio.apagarVisita(roteiroId, pontoId);
}

export async function excluir(usuarioId: string, roteiroId: string) {
  if (!(await repositorio.apagarDoUsuario(roteiroId, usuarioId))) throw naoEncontrado('Roteiro');
}
