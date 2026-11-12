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

export function useLocalizacao(automatico = true): Localizacao {
  const [estado, setEstado] = useState<EstadoLocalizacao>('inicial');
  const [coordenada, setCoordenada] = useState<Coordenada | null>(null);
  const [precisaoM, setPrecisaoM] = useState<number | null>(null);
  const [descricao, setDescricao] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [refinando, setRefinando] = useState(false);
  const [aproximada, setAproximada] = useState(false);
  const [precisaAbrirAjustes, setPrecisaAbrirAjustes] = useState(false);

  // Cada pedido ganha um número: resposta de pedido antigo é ignorada.
  const pedidoAtual = useRef(0);

  const solicitar = useCallback(async () => {
    const pedido = ++pedidoAtual.current;
    const vigente = () => pedido === pedidoAtual.current;

    const aplicar = (posicao: Location.LocationObject) => {
      setCoordenada({ lat: posicao.coords.latitude, lng: posicao.coords.longitude });
      setPrecisaoM(posicao.coords.accuracy ?? null);
      setEstado('obtida');
    };

    setEstado('solicitando');
    setErro(null);
    setRefinando(false);
    setPrecisaAbrirAjustes(false);

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

  useEffect(() => {
    if (automatico) void solicitar();
  }, [automatico, solicitar]);

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
