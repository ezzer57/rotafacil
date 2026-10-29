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
  Visita,
} from '@/domain/types';
import type { ServicosApp } from '@/data/services';
import { CIDADES, PONTOS, pontosPorCidade } from './dados';
import { gerarRoteiro } from './motor';

const atraso = (ms = 700) => new Promise((r) => setTimeout(r, ms));

const historico = new Map<ID, Roteiro>();

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
  };
}

/**
 * Regera o roteiro a partir das preferências originais, opcionalmente com
 * outro orçamento, descartando os pontos indicados. É o que o backend fará
 * ao receber um PATCH.
 */
function recalcular(roteiro: Roteiro, excluir: ID[], novoOrcamento?: Reais): Roteiro {
  const preferencias: PreferenciasRoteiro = {
    ...roteiro.preferencias,
    orcamento: novoOrcamento ?? roteiro.preferencias.orcamento,
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
  return atualizado;
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
        return roteiro;
      },
      async listar() {
        await atraso(400);
        return [...historico.values()]
          .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
          .map(resumir);
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
      async registrarVisita(roteiroId, pontoId) {
        await atraso(300);
        const roteiro = historico.get(roteiroId);
        if (roteiro) {
          historico.set(roteiroId, {
            ...roteiro,
            itens: roteiro.itens.map((i) =>
              i.ponto.id === pontoId ? { ...i, visitado: true } : i,
            ),
          });
        }
        const visita: Visita = {
          id: `v-${Date.now()}`,
          roteiroId,
          pontoId,
          chegadaEm: new Date().toISOString(),
          custoRegistrado: null,
        };
        return visita;
      },
      async excluir(roteiroId) {
        await atraso(300);
        historico.delete(roteiroId);
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
