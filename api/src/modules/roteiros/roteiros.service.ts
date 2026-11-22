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
 * A rede (servidor de rotas) fica fora da transação, para o banco não ficar
 * preso esperando resposta. As consultas ficam em `repositorio.ts`, e a
 * tradução do resultado para as tabelas, em `gravacao.ts`.
 */

import { haversine, type Coordenada } from '@/core/geo.js';
import { gerarRoteiro, type Categoria, type ResultadoRoteiro } from '@/core/roteirizacao.js';
import type { DadosGerarRoteiro } from '@/contratos/index.js';
import { naoEncontrado, regraDeNegocio } from '@/lib/erros.js';
import { clienteDeRotas, type Tracado } from '@/lib/rotas.js';
import { paraGravacao, type PedidoDeRoteiro } from './gravacao.js';
import * as repositorio from './repositorio.js';
import { serializarResumo, serializarRoteiro } from './serializador.js';

/**
 * Distância máxima entre o ponto de partida e o centro da cidade. É o mesmo
 * raio que o aplicativo usa para decidir se parte do GPS ou do centro: os
 * dois precisam concordar, senão o app manda uma posição que a API recusa.
 */
const RAIO_COBERTURA_CIDADE_KM = 60;

/** Ruas de cada parada, a partir da anterior; só o que foi medido pelas ruas. */
async function tracarTrechos(
  origem: Coordenada,
  resultado: ResultadoRoteiro,
): Promise<(Tracado | null)[]> {
  if (!clienteDeRotas) return resultado.itens.map(() => null);

  return clienteDeRotas.tracarVarios(
    resultado.itens.map((item, i) =>
      item.trechoAteAqui.fonte === 'ruas'
        ? {
            perfil: item.trechoAteAqui.modal === 'pe' ? 'pe' : 'carro',
            de: i === 0 ? origem : resultado.itens[i - 1]!.candidato.coordenada,
            para: item.candidato.coordenada,
          }
        : null,
    ),
  );
}

/** Executa o motor e grava o resultado, substituindo o roteiro quando é recálculo. */
async function calcularEGravar(pedido: PedidoDeRoteiro, roteiroExistenteId?: string) {
  const tarifa = await repositorio.carregarTarifa(pedido.cidadeId);
  const candidatos = await repositorio.carregarCandidatos(pedido.cidadeId, pedido.excluidos);
  if (candidatos.length === 0) {
    throw regraDeNegocio('Esta cidade ainda não tem pontos turísticos cadastrados');
  }

  // Uma só consulta mede todos os pares de pontos; sem resposta, o motor usa
  // a estimativa em linha reta e o roteiro diz isso.
  const { origem } = pedido.preferencias;
  const medidor =
    (await clienteDeRotas?.medirTudo([origem, ...candidatos.map((c) => c.coordenada)])) ??
    undefined;

  const resultado = gerarRoteiro(candidatos, pedido.preferencias, tarifa, medidor);
  const tracados = await tracarTrechos(origem, resultado);

  return repositorio.salvar(paraGravacao(pedido, resultado, tracados), roteiroExistenteId);
}

/* -------------------------------------------------------- casos de uso */

export async function gerar(usuarioId: string, entrada: DadosGerarRoteiro) {
  const cidade = await repositorio.resolverCidade(entrada.cidadeId, entrada.origem);

  const distanciaDoCentro = haversine(entrada.origem, { lat: cidade.lat, lng: cidade.lng });
  if (distanciaDoCentro > RAIO_COBERTURA_CIDADE_KM) {
    throw regraDeNegocio(
      `O ponto de partida está a ${Math.round(distanciaDoCentro)} km de ${cidade.nome}. ` +
        'Escolha partir do centro da cidade.',
    );
  }

  const roteiro = await calcularEGravar({
    usuarioId,
    cidadeId: cidade.id,
    preferencias: {
      origem: entrada.origem,
      categorias: entrada.categorias as Categoria[],
      orcamento: entrada.orcamento,
      tempoDisponivelMin: entrada.tempoDisponivelMin,
      inicioPrevisto: entrada.inicioPrevisto,
    },
    excluidos: [],
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
 * recalcula o roteiro com as mesmas preferências de quando foi criado.
 */
export async function ajustar(
  usuarioId: string,
  roteiroId: string,
  operacao:
    | { tipo: 'remover' | 'substituir'; pontoId: string }
    | { tipo: 'orcamento'; valor: number | null },
) {
  const atual = await repositorio.carregarDoUsuario(roteiroId, usuarioId);

  const excluidos =
    operacao.tipo === 'orcamento'
      ? atual.pontosExcluidos
      : [...new Set([...atual.pontosExcluidos, operacao.pontoId])];

  const orcamentoAtual = atual.orcamento == null ? null : Number(atual.orcamento);

  const roteiro = await calcularEGravar(
    {
      usuarioId,
      cidadeId: atual.cidadeId,
      preferencias: {
        origem: { lat: atual.origemLat, lng: atual.origemLng },
        categorias: atual.categorias as Categoria[],
        orcamento: operacao.tipo === 'orcamento' ? operacao.valor : orcamentoAtual,
        tempoDisponivelMin: atual.tempoDisponivelMin,
        inicioPrevisto: atual.inicioPrevisto,
      },
      excluidos,
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
