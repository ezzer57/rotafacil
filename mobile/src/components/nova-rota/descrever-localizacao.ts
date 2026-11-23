/**
 * O que o cartão de localização diz, em cada situação.
 *
 * Ser explícito aqui atende ao princípio da transparência da LGPD: o usuário
 * vê quando a localização está sendo usada e quando não está, e por quê.
 * Função pura, para cada caso poder ser testado sem desenhar a tela.
 */

import type { Ionicons } from '@expo/vector-icons';

import { formatarDistancia } from '@/domain/format';
import type { Partida } from '@/domain/partida';
import type { Localizacao } from '@/hooks/use-localizacao';

/** Acima desta margem de erro, a tela pede para conferir o ponto no mapa. */
export const PRECISAO_BAIXA_M = 100;

export type AcaoDeLocalizacao = 'tentar-de-novo' | 'atualizar' | 'abrir-ajustes';

export interface DescricaoDaLocalizacao {
  tom: 'sucesso' | 'alerta' | 'neutro';
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  detalhe: string;
  acao: AcaoDeLocalizacao | null;
}

type DadosDaLocalizacao = Pick<
  Localizacao,
  'estado' | 'precisaoM' | 'descricao' | 'erro' | 'refinando' | 'aproximada' | 'precisaAbrirAjustes'
>;

export function descreverLocalizacao(
  localizacao: DadosDaLocalizacao,
  partida: Pick<Partida, 'modo' | 'gpsNaCidade' | 'detectada'>,
  nomeCidade: string,
  naWeb: boolean,
): DescricaoDaLocalizacao {
  const { modo, gpsNaCidade, detectada } = partida;

  if (modo === 'manual') {
    return {
      tom: 'sucesso',
      icone: 'pin',
      titulo: 'Partindo do ponto que você marcou',
      detalhe: gpsNaCidade
        ? 'Toque em "Minha posição" para voltar a usar o GPS.'
        : `Toque em "Centro de ${nomeCidade}" para desfazer.`,
      acao: null,
    };
  }

  if (modo === 'gps') return descreverGps(localizacao);

  // Daqui em diante o roteiro parte do centro; o cartão explica o motivo.
  if (gpsNaCidade) {
    return {
      tom: 'neutro',
      icone: 'business-outline',
      titulo: `Partindo do centro de ${nomeCidade}`,
      detalhe: 'Toque em "Minha posição" para partir de onde você está.',
      acao: null,
    };
  }

  if (localizacao.estado === 'solicitando' || localizacao.estado === 'inicial') {
    return {
      tom: 'neutro',
      icone: 'locate-outline',
      titulo: 'Obtendo sua localização...',
      detalhe: 'Autorize o acesso para o roteiro começar de onde você está.',
      acao: null,
    };
  }

  if (localizacao.estado === 'obtida' && detectada && !detectada.dentroDaCobertura) {
    return {
      tom: 'alerta',
      icone: 'alert-circle-outline',
      titulo: 'Você está fora das cidades atendidas',
      detalhe: `A cidade mais próxima é ${detectada.cidade.nome}, a ${formatarDistancia(detectada.distanciaKm)} daqui. O roteiro vai partir do centro dela, ou do ponto que você tocar no mapa.`,
      acao: null,
    };
  }

  if (localizacao.estado === 'obtida') {
    return {
      tom: 'neutro',
      icone: 'navigate-outline',
      titulo: `Partindo do centro de ${nomeCidade}`,
      detalhe: 'Você escolheu uma cidade diferente da sua posição atual.',
      acao: null,
    };
  }

  const reserva = `Enquanto isso, o roteiro parte do centro de ${nomeCidade} ou do ponto que você tocar no mapa.`;

  if (localizacao.estado === 'desligada') {
    return {
      tom: 'alerta',
      icone: 'location-outline',
      titulo: 'A localização do aparelho está desligada',
      detalhe: `Ligue a localização (GPS) nas configurações rápidas do aparelho e tente de novo. ${reserva}`,
      acao: 'tentar-de-novo',
    };
  }

  if (localizacao.estado === 'negada') {
    // Depois de negar de vez, o sistema não mostra mais o pedido de permissão.
    const abrirAjustes = localizacao.precisaAbrirAjustes && !naWeb;
    return {
      tom: 'alerta',
      icone: 'location-outline',
      titulo: 'Sem acesso à sua localização',
      detalhe: abrirAjustes
        ? `Libere a localização para o RotaFácil nos ajustes do aparelho. ${reserva}`
        : reserva,
      acao: abrirAjustes ? 'abrir-ajustes' : 'tentar-de-novo',
    };
  }

  return {
    tom: 'alerta',
    icone: 'location-outline',
    titulo: 'Não foi possível obter sua localização',
    detalhe: `${localizacao.erro ? `${localizacao.erro.replace(/\.$/, '')}. ` : ''}${reserva}`,
    acao: 'tentar-de-novo',
  };
}

function descreverGps(localizacao: DadosDaLocalizacao): DescricaoDaLocalizacao {
  const precisao = localizacao.precisaoM != null ? Math.round(localizacao.precisaoM) : null;
  const atualizando = localizacao.refinando || localizacao.estado === 'solicitando';
  const imprecisa = localizacao.aproximada || (precisao != null && precisao > PRECISAO_BAIXA_M);
  const alertar = imprecisa && !atualizando;

  let detalhe: string;
  if (atualizando) {
    detalhe = 'Melhorando a precisão com o GPS... O ponto no mapa pode se mexer um pouco.';
  } else if (localizacao.aproximada) {
    detalhe =
      'O aparelho liberou só a localização aproximada, que pode errar por quilômetros. Confira o ponto no mapa e toque no lugar certo se precisar.';
  } else if (precisao == null) {
    detalhe = 'O roteiro parte da sua posição atual.';
  } else if (imprecisa) {
    detalhe = `Margem de erro de cerca de ${precisao} m (círculo no mapa). Se o ponto estiver errado, toque no lugar certo ou atualize em um local aberto.`;
  } else {
    detalhe = `Margem de erro de cerca de ${precisao} m. O roteiro parte daqui.`;
  }

  return {
    tom: alertar ? 'alerta' : 'sucesso',
    icone: 'navigate-circle',
    titulo: localizacao.descricao
      ? `Você está em ${localizacao.descricao}`
      : 'Usando sua posição atual',
    detalhe,
    acao: alertar ? 'atualizar' : null,
  };
}
