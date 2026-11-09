/**
 * Implementação simulada dos serviços.
 *
 * Mantém um armazenamento em memória e um atraso artificial, para que as
 * telas exercitem de verdade os estados de carregamento e de erro. Quando o
 * backend existir, esta fábrica é substituída por createServicosHttp().
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
import type { ServicosApp } from '@/data/services';
import { CIDADES, PONTOS, pontosPorCidade } from './dados';
import { gerarRoteiro } from './motor';

const atraso = (ms = 700) => new Promise((r) => setTimeout(r, ms));

const historico = new Map<ID, Roteiro>();

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
 * Credencial de demonstração enquanto o backend não existe. No produto, a
 * conferência é feita no servidor, comparando o hash da senha; o aplicativo
 * nunca guarda nem compara senha.
 */
// Oito dígitos: o formulário exige a mesma senha mínima do servidor.
const SENHA_DEMONSTRACAO = '12345678';

/* ----------------------------------------------------- roteiro de exemplo */

/**
 * Um roteiro pronto no histórico, para que a tela inicial não abra vazia na
 * apresentação. Sai quando o backend entrar.
 */
function semearExemplo() {
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  ontem.setHours(9, 0, 0, 0);

  const roteiro = gerarRoteiro({
    cidadeId: 'fortaleza',
    origem: CIDADES[1].centro,
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
    capaUrl: roteiro.itens[0]?.ponto.fotoUrl ?? null,
    pontosVisitados: roteiro.totais.pontosVisitados,
    custoRegistrado: roteiro.totais.custoRegistrado,
  };
}

/**
 * Regera o roteiro a partir das preferências originais, opcionalmente com
 * outro teto de gasto (null tira o teto), descartando os pontos indicados. É
 * o que o backend faz ao receber um PATCH.
 */
function recalcular(roteiro: Roteiro, excluir: ID[], novoOrcamento?: Reais | null): Roteiro {
  const preferencias: PreferenciasRoteiro = {
    ...roteiro.preferencias,
    orcamento: novoOrcamento === undefined ? roteiro.preferencias.orcamento : novoOrcamento,
  };

  const novo = gerarRoteiro(preferencias);
  const atualizado: Roteiro = {
    ...novo,
    id: roteiro.id,
    criadoEm: roteiro.criadoEm,
    itens: novo.itens
      .filter((i) => !excluir.includes(i.ponto.id))
      .map((i, idx) => ({ ...i, ordem: idx + 1 })),
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
        const roteiro = historico.get(id);
        if (!roteiro) throw new Error('Roteiro não encontrado');
        return comVisitas(roteiro);
      },
      async listar() {
        await atraso(400);
        return [...historico.values()]
          .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
          .map((roteiro) => resumir(comVisitas(roteiro)));
      },
      async removerPonto(roteiroId, pontoId) {
        await atraso(900);
        const roteiro = historico.get(roteiroId);
        if (!roteiro) throw new Error('Roteiro não encontrado');
        return recalcular(roteiro, [pontoId]);
      },
      async substituirPonto(roteiroId, pontoId) {
        await atraso(900);
        const roteiro = historico.get(roteiroId);
        if (!roteiro) throw new Error('Roteiro não encontrado');
        return recalcular(roteiro, [pontoId]);
      },
      async ajustarOrcamento(roteiroId, novoOrcamento) {
        await atraso(450);
        const roteiro = historico.get(roteiroId);
        if (!roteiro) throw new Error('Roteiro não encontrado');
        return recalcular(roteiro, [], novoOrcamento);
      },
      async registrarVisita(roteiroId, pontoId, custoRegistrado) {
        await atraso(300);
        const roteiro = historico.get(roteiroId);
        if (!roteiro) throw new Error('Roteiro não encontrado');
        if (!roteiro.itens.some((i) => i.ponto.id === pontoId)) {
          throw new Error('Este ponto não faz parte do roteiro');
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
        if (!visitas.get(roteiroId)?.delete(pontoId)) throw new Error('Check-in não encontrado');
      },
      async excluir(roteiroId) {
        await atraso(300);
        historico.delete(roteiroId);
        visitas.delete(roteiroId);
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
        if (!ponto) throw new Error('Ponto não encontrado');
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
        // Simula a resposta 401 do servidor quando a credencial não confere.
        if (senha !== SENHA_DEMONSTRACAO) {
          throw new Error('E-mail ou senha incorretos');
        }
        const nome = email.split('@')[0] || 'viajante';
        usuario = {
          id: 'u-1',
          nome: nome.charAt(0).toUpperCase() + nome.slice(1),
          email,
          avatarUrl: null,
        };
        return usuario;
      },
      async registrar(nome, email) {
        await atraso(1100);
        // Simula a resposta 409 do servidor para e-mail já cadastrado.
        if (email.trim().toLowerCase() === 'usado@exemplo.com') {
          throw new Error('Este e-mail já está cadastrado');
        }
        usuario = { id: 'u-1', nome, email, avatarUrl: null };
        return usuario;
      },
      async sair() {
        await atraso(200);
        usuario = null;
      },
    },
  };
}

export { pontosPorCidade };
