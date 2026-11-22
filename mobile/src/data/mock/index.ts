/**
 * Modo de demonstração: os serviços sem servidor.
 *
 * Usado quando EXPO_PUBLIC_API_URL está vazio (ver src/data/provider.tsx).
 * Guarda tudo em memória, com um atraso artificial para as telas mostrarem
 * os estados de carregamento, e responde como a API: o roteiro sai do mesmo
 * motor (./motor.ts), os pontos tirados ficam lembrados no recálculo e os
 * erros têm o mesmo status e código.
 */

import type {
  Cidade,
  ID,
  PontoInteresse,
  PreferenciasRoteiro,
  Reais,
  ResumoRoteiro,
  Roteiro,
  Usuario,
  VisitaRegistrada,
} from '@/domain/types';
import { ErroApi } from '@/data/erros';
import type { ServicosApp } from '@/data/services';
import { CIDADES, PONTOS, cidadeDoMock, pontosPorCidade } from './dados';
import { gerarRoteiro } from './motor';

const atraso = (ms = 700) => new Promise((r) => setTimeout(r, ms));

const naoEncontrado = (recurso: string) =>
  new ErroApi(404, `${recurso} não encontrado`, 'NAO_ENCONTRADO');

const historico = new Map<ID, Roteiro>();

/** Pontos que o usuário tirou de cada roteiro, como a coluna pontosExcluidos da API. */
const excluidosPorRoteiro = new Map<ID, ID[]>();

function roteiroGuardado(id: ID): Roteiro {
  const roteiro = historico.get(id);
  if (!roteiro) throw naoEncontrado('Roteiro');
  return roteiro;
}

/** Check-ins por roteiro, como a tabela de visitas do backend. */
const visitas = new Map<ID, Map<ID, VisitaRegistrada>>();

/** Aplica os check-ins ao roteiro guardado, como o serializador da API faz. */
function comVisitas(roteiro: Roteiro): Roteiro {
  const doRoteiro = visitas.get(roteiro.id) ?? new Map<ID, VisitaRegistrada>();
  const pagas = [...doRoteiro.values()].filter((v) => v.custoRegistrado != null);
  return {
    ...roteiro,
    itens: roteiro.itens.map((i) => {
      const visita = doRoteiro.get(i.ponto.id) ?? null;
      return { ...i, visitado: visita != null, visita };
    }),
    totais: {
      ...roteiro.totais,
      pontosVisitados: doRoteiro.size,
      custoRegistrado: pagas.length
        ? Math.round(pagas.reduce((s, v) => s + (v.custoRegistrado ?? 0), 0) * 100) / 100
        : null,
    },
  };
}

/** Começa deslogado, para que o fluxo de entrada possa ser demonstrado. */
let usuario: Usuario | null = null;

/**
 * Senha única do modo de demonstração. Com a API, a conferência é feita no
 * servidor, pelo hash da senha; o aplicativo nunca guarda nem compara senha.
 */
// Oito dígitos: o formulário exige a mesma senha mínima do servidor.
const SENHA_DEMONSTRACAO = '12345678';

/* ----------------------------------------------------- roteiro de exemplo */

/** Um roteiro pronto no histórico, para a tela inicial não abrir vazia na demonstração. */
function semearExemplo() {
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  ontem.setHours(9, 0, 0, 0);

  const roteiro = gerarRoteiro({
    cidadeId: 'fortaleza',
    origem: cidadeDoMock('fortaleza').centro,
    categorias: ['cultura', 'gastronomia'],
    orcamento: 120,
    tempoDisponivelMin: 300,
    inicioPrevisto: ontem.toISOString(),
  });

  historico.set(roteiro.id, { ...roteiro, criadoEm: ontem.toISOString() });
}
semearExemplo();

function resumir(roteiro: Roteiro): ResumoRoteiro {
  return {
    id: roteiro.id,
    cidadeNome: roteiro.cidadeNome,
    criadoEm: roteiro.criadoEm,
    totalPontos: roteiro.itens.length,
    custoEstimado: roteiro.totais.custoTotal.estimado,
    capaUrl: roteiro.itens.find((item) => item.ponto.fotoUrl)?.ponto.fotoUrl ?? null,
    pontosVisitados: roteiro.totais.pontosVisitados,
    custoRegistrado: roteiro.totais.custoRegistrado,
  };
}

/**
 * Recalcula o roteiro com as preferências de quando foi criado, como a API
 * faz num PATCH: os pontos tirados agora se somam aos de antes e ficam fora
 * da escolha do motor, e o teto muda quando `novoOrcamento` vem (null tira).
 */
function recalcular(roteiro: Roteiro, tirar: ID[], novoOrcamento?: Reais | null): Roteiro {
  const preferencias: PreferenciasRoteiro = {
    ...roteiro.preferencias,
    orcamento: novoOrcamento === undefined ? roteiro.preferencias.orcamento : novoOrcamento,
  };
  const excluidos = [...new Set([...(excluidosPorRoteiro.get(roteiro.id) ?? []), ...tirar])];
  excluidosPorRoteiro.set(roteiro.id, excluidos);

  const atualizado: Roteiro = {
    ...gerarRoteiro(preferencias, excluidos),
    id: roteiro.id,
    criadoEm: roteiro.criadoEm,
  };
  historico.set(atualizado.id, atualizado);
  return comVisitas(atualizado);
}

export function createServicosMock(): ServicosApp {
  return {
    roteiros: {
      async gerar(preferencias) {
        await atraso(1200); // simula a latência do algoritmo + APIs externas
        const roteiro = gerarRoteiro(preferencias);
        historico.set(roteiro.id, roteiro);
        return roteiro;
      },
      async obter(id) {
        await atraso(300);
        return comVisitas(roteiroGuardado(id));
      },
      async listar() {
        await atraso(400);
        return [...historico.values()]
          .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
          .map((roteiro) => resumir(comVisitas(roteiro)));
      },
      async removerPonto(roteiroId, pontoId) {
        await atraso(900);
        return recalcular(roteiroGuardado(roteiroId), [pontoId]);
      },
      // Como na API: o ponto sai e o motor escolhe o que entra no lugar.
      async substituirPonto(roteiroId, pontoId) {
        await atraso(900);
        return recalcular(roteiroGuardado(roteiroId), [pontoId]);
      },
      async ajustarOrcamento(roteiroId, novoOrcamento) {
        await atraso(450);
        return recalcular(roteiroGuardado(roteiroId), [], novoOrcamento);
      },
      async registrarVisita(roteiroId, pontoId, custoRegistrado) {
        await atraso(300);
        const roteiro = roteiroGuardado(roteiroId);
        if (!roteiro.itens.some((i) => i.ponto.id === pontoId)) {
          throw new ErroApi(400, 'Este ponto não faz parte do roteiro', 'REGRA_DE_NEGOCIO');
        }

        const doRoteiro = visitas.get(roteiroId) ?? new Map<ID, VisitaRegistrada>();
        // Refazer o check-in só atualiza o valor pago; a hora de chegada fica.
        const visita: VisitaRegistrada = {
          chegadaEm: doRoteiro.get(pontoId)?.chegadaEm ?? new Date().toISOString(),
          custoRegistrado: custoRegistrado ?? null,
        };
        doRoteiro.set(pontoId, visita);
        visitas.set(roteiroId, doRoteiro);

        return { id: `v-${roteiroId}-${pontoId}`, roteiroId, pontoId, ...visita };
      },
      async desfazerVisita(roteiroId, pontoId) {
        await atraso(300);
        if (!visitas.get(roteiroId)?.delete(pontoId)) throw naoEncontrado('Check-in');
      },
      async excluir(roteiroId) {
        await atraso(300);
        if (!historico.delete(roteiroId)) throw naoEncontrado('Roteiro');
        visitas.delete(roteiroId);
        excluidosPorRoteiro.delete(roteiroId);
      },
    },

    cidades: {
      async listar(): Promise<Cidade[]> {
        await atraso(250);
        return CIDADES;
      },
      async buscar(termo: string) {
        await atraso(250);
        const t = termo.trim().toLowerCase();
        if (!t) return CIDADES;
        return CIDADES.filter((c) => c.nome.toLowerCase().includes(t));
      },
    },

    pontos: {
      async obter(pontoId: ID): Promise<PontoInteresse> {
        await atraso(200);
        const ponto = PONTOS.find((p) => p.id === pontoId);
        if (!ponto) throw naoEncontrado('Ponto de interesse');
        return ponto;
      },
    },

    auth: {
      async usuarioAtual() {
        await atraso(150);
        return usuario;
      },
      async entrar(email, senha) {
        await atraso(900);
        // A mesma resposta da API quando a credencial não confere.
        if (senha !== SENHA_DEMONSTRACAO) {
          throw new ErroApi(401, 'E-mail ou senha incorretos', 'CREDENCIAL_INVALIDA');
        }
        const nome = email.split('@')[0] || 'viajante';
        usuario = {
          id: 'u-1',
          nome: nome.charAt(0).toUpperCase() + nome.slice(1),
          email,
        };
        return usuario;
      },
      async registrar(nome, email) {
        await atraso(1100);
        // A mesma resposta da API para e-mail já cadastrado.
        if (email.trim().toLowerCase() === 'usado@exemplo.com') {
          throw new ErroApi(409, 'Este e-mail já está cadastrado', 'CONFLITO');
        }
        usuario = { id: 'u-1', nome, email };
        return usuario;
      },
      async sair() {
        await atraso(200);
        usuario = null;
      },
      async excluirConta() {
        await atraso(600);
        historico.clear();
        visitas.clear();
        excluidosPorRoteiro.clear();
        usuario = null;
      },
    },
  };
}

export { pontosPorCidade };
