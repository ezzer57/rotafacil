/**
 * Acesso à localização do aparelho.
 *
 * Usa apenas localização em primeiro plano (`ACCESS_FINE_LOCATION` em uso),
 * nunca em segundo plano. É a opção mais simples de justificar sob a LGPD,
 * atende ao caso de uso do aplicativo e não consome bateria com o app
 * fechado.
 *
 * A leitura acontece em dois tempos: primeiro a última posição conhecida,
 * que sai na hora, e depois a do GPS em alta precisão, que pode levar alguns
 * segundos. A tela não fica parada esperando o satélite.
 *
 * A coordenada obtida nunca é gravada no aparelho: ela vive em memória
 * durante a sessão e é enviada ao serviço somente para gerar o roteiro.
 */

import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Coordenada } from '@/domain/types';

export type EstadoLocalizacao =
  | 'inicial'
  | 'solicitando'
  | 'obtida'
  | 'negada'
  /** A localização do aparelho está desligada nas configurações. */
  | 'desligada'
  | 'indisponivel';

export interface Localizacao {
  estado: EstadoLocalizacao;
  coordenada: Coordenada | null;
  /** Margem de erro informada pelo aparelho, em metros. */
  precisaoM: number | null;
  /** Bairro ou cidade, quando a geocodificação reversa funciona. */
  descricao: string | null;
  erro: string | null;
  /** A posição mostrada é provisória: o GPS ainda está melhorando a leitura. */
  refinando: boolean;
  /** O usuário liberou só a localização aproximada, que erra por quilômetros. */
  aproximada: boolean;
  /** A permissão foi negada de vez: só as configurações do aparelho resolvem. */
  precisaAbrirAjustes: boolean;
  solicitar: () => Promise<void>;
}

/** A última posição conhecida só serve se for recente e razoavelmente boa. */
const ULTIMA_POSICAO_IDADE_MAX_MS = 2 * 60_000;
const ULTIMA_POSICAO_PRECISAO_MAX_M = 500;

/** A leitura do GPS não tem prazo próprio; em lugar fechado pode não chegar. */
const PRAZO_GPS_MS = 20_000;

const prazoEsgotado = () =>
  new Promise<null>((resolver) => setTimeout(() => resolver(null), PRAZO_GPS_MS));

/** No "Recalcular daqui" a pessoa está esperando na tela: o GPS tem menos tempo. */
const PRAZO_LEITURA_UNICA_MS = 10_000;

/**
 * Lê a posição uma vez, para o "Recalcular daqui": a do GPS, se vier no
 * prazo, ou a última conhecida, se for recente. Devolve null quando a
 * localização está desligada, a permissão é negada ou nada chega a tempo, e
 * quem chama decide de onde partir. Como a outra leitura, só com o app aberto
 * e sem guardar nada no aparelho.
 */
export async function lerPosicaoAgora(): Promise<Coordenada | null> {
  let prazo: ReturnType<typeof setTimeout> | undefined;
  try {
    if (!(await Location.hasServicesEnabledAsync())) return null;
    const permissao = await Location.requestForegroundPermissionsAsync();
    if (!permissao.granted) return null;

    const precisa = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>((resolver) => {
        prazo = setTimeout(() => resolver(null), PRAZO_LEITURA_UNICA_MS);
      }),
    ]).catch(() => null);
    const posicao =
      precisa ??
      (await Location.getLastKnownPositionAsync({
        maxAge: ULTIMA_POSICAO_IDADE_MAX_MS,
        requiredAccuracy: ULTIMA_POSICAO_PRECISAO_MAX_M,
      }).catch(() => null));

    return posicao ? { lat: posicao.coords.latitude, lng: posicao.coords.longitude } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(prazo);
  }
}

export function useLocalizacao(automatico = true): Localizacao {
  const [estado, setEstado] = useState<EstadoLocalizacao>(automatico ? 'solicitando' : 'inicial');
  const [coordenada, setCoordenada] = useState<Coordenada | null>(null);
  const [precisaoM, setPrecisaoM] = useState<number | null>(null);
  const [descricao, setDescricao] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [refinando, setRefinando] = useState(false);
  const [aproximada, setAproximada] = useState(false);
  const [precisaAbrirAjustes, setPrecisaAbrirAjustes] = useState(false);

  // Cada pedido ganha um número: resposta de pedido antigo é ignorada.
  const pedidoAtual = useRef(0);

  /**
   * Lê a posição. Só muda o estado depois de cada espera (permissão, GPS):
   * assim pode ser chamada de dentro de um efeito sem renderizações em cascata.
   */
  const buscar = useCallback(async () => {
    const pedido = ++pedidoAtual.current;
    const vigente = () => pedido === pedidoAtual.current;

    const aplicar = (posicao: Location.LocationObject) => {
      setCoordenada({ lat: posicao.coords.latitude, lng: posicao.coords.longitude });
      setPrecisaoM(posicao.coords.accuracy ?? null);
      setEstado('obtida');
    };

    try {
      if (!(await Location.hasServicesEnabledAsync())) {
        if (!vigente()) return;
        setEstado('desligada');
        setErro('A localização do aparelho está desligada');
        return;
      }

      const permissao = await Location.requestForegroundPermissionsAsync();
      if (!vigente()) return;

      if (!permissao.granted) {
        setEstado('negada');
        setErro('Permissão de localização negada');
        setPrecisaAbrirAjustes(!permissao.canAskAgain);
        return;
      }

      // "Localização aproximada" (Android 12+) ou "precisa" desligada (iOS 14+).
      setAproximada(
        permissao.android?.accuracy === 'coarse' || permissao.ios?.accuracy === 'reduced',
      );

      const ultima = await Location.getLastKnownPositionAsync({
        maxAge: ULTIMA_POSICAO_IDADE_MAX_MS,
        requiredAccuracy: ULTIMA_POSICAO_PRECISAO_MAX_M,
      }).catch(() => null);
      if (!vigente()) return;

      if (ultima) {
        aplicar(ultima);
        setRefinando(true);
      }

      const precisa = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        prazoEsgotado(),
      ]).catch(() => null);
      if (!vigente()) return;
      setRefinando(false);

      const melhor = precisa ?? ultima;
      if (!melhor) {
        setEstado('indisponivel');
        setErro('O GPS não respondeu. Tente em um lugar aberto.');
        return;
      }
      aplicar(melhor);

      // Geocodificação reversa: opcional, só melhora o texto da tela.
      try {
        const [endereco] = await Location.reverseGeocodeAsync({
          latitude: melhor.coords.latitude,
          longitude: melhor.coords.longitude,
        });
        if (endereco && vigente()) {
          setDescricao(
            [endereco.district ?? endereco.subregion, endereco.city ?? endereco.region]
              .filter(Boolean)
              .join(', ') || null,
          );
        }
      } catch {
        // Sem geocodificação reversa a tela apenas não mostra o bairro.
      }
    } catch (e) {
      if (!vigente()) return;
      setRefinando(false);
      setEstado('indisponivel');
      setErro(e instanceof Error ? e.message : 'Não foi possível obter a localização');
    }
  }, []);

  /** Pedido do usuário (ex.: "Tentar novamente"): mostra "obtendo" na hora e busca. */
  const solicitar = useCallback(async () => {
    setEstado('solicitando');
    setErro(null);
    setRefinando(false);
    setPrecisaAbrirAjustes(false);
    await buscar();
  }, [buscar]);

  useEffect(() => {
    // A regra não enxerga que `buscar` só muda o estado depois de cada `await`
    // (permissão e GPS), então não há renderização em cascata aqui.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (automatico) void buscar();
  }, [automatico, buscar]);

  return {
    estado,
    coordenada,
    precisaoM,
    descricao,
    erro,
    refinando,
    aproximada,
    precisaAbrirAjustes,
    solicitar,
  };
}
