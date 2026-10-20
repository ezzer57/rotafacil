/**
 * Acesso à localização do aparelho.
 *
 * Usa apenas localização em primeiro plano (`ACCESS_FINE_LOCATION` em uso),
 * nunca em segundo plano. É a opção mais simples de justificar sob a LGPD,
 * atende ao caso de uso do aplicativo e não consome bateria com o app
 * fechado.
 *
 * A coordenada obtida nunca é gravada: ela vive em memória durante a sessão
 * e é enviada ao serviço somente para gerar o roteiro.
 */

import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import type { Coordenada } from '@/domain/types';

export type EstadoLocalizacao =
  | 'inicial'
  | 'solicitando'
  | 'obtida'
  | 'negada'
  | 'indisponivel';

export interface Localizacao {
  estado: EstadoLocalizacao;
  coordenada: Coordenada | null;
  /** Precisão informada pelo aparelho, em metros. */
  precisaoM: number | null;
  /** Bairro ou cidade, quando a geocodificação reversa funciona. */
  descricao: string | null;
  erro: string | null;
  solicitar: () => Promise<void>;
}

export function useLocalizacao(automatico = true): Localizacao {
  const [estado, setEstado] = useState<EstadoLocalizacao>('inicial');
  const [coordenada, setCoordenada] = useState<Coordenada | null>(null);
  const [precisaoM, setPrecisaoM] = useState<number | null>(null);
  const [descricao, setDescricao] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const solicitar = useCallback(async () => {
    setEstado('solicitando');
    setErro(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setEstado('negada');
        setErro('Permissão de localização negada');
        return;
      }

      const posicao = await Location.getCurrentPositionAsync({
        // Equilíbrio entre precisão e consumo: suficiente para escolher
        // pontos de interesse num raio urbano.
        accuracy: Location.Accuracy.Balanced,
      });

      setCoordenada({
        lat: posicao.coords.latitude,
        lng: posicao.coords.longitude,
      });
      setPrecisaoM(posicao.coords.accuracy ?? null);
      setEstado('obtida');

      // Geocodificação reversa: opcional, só melhora o texto da tela.
      try {
        const [endereco] = await Location.reverseGeocodeAsync({
          latitude: posicao.coords.latitude,
          longitude: posicao.coords.longitude,
        });
        if (endereco) {
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
      setEstado('indisponivel');
      setErro(e instanceof Error ? e.message : 'Não foi possível obter a localização');
    }
  }, []);

  useEffect(() => {
    if (automatico) void solicitar();
  }, [automatico, solicitar]);

  return { estado, coordenada, precisaoM, descricao, erro, solicitar };
}
