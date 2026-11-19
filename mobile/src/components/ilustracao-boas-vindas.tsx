/**
 * Ilustração da tela de boas-vindas: serras e monólitos do sertão (lembrando
 * Quixadá) e uma rota tracejada ligando o ponto de partida ao destino.
 *
 * Feita só com Views, sem imagem: fica nítida em qualquer tela, acompanha o
 * tamanho disponível e some quando não há espaço (celular pequeno).
 */

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

/** Abaixo desta altura, a ilustração não aparece: os botões têm prioridade. */
const ALTURA_MINIMA = 150;

/** Ponto de uma curva de Bézier quadrática, para desenhar a rota. */
function pontoNaCurva(
  t: number,
  a: [number, number],
  c: [number, number],
  b: [number, number],
): [number, number] {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
}

export function IlustracaoBoasVindas() {
  const [tamanho, setTamanho] = useState<{ l: number; a: number } | null>(null);

  const medir = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setTamanho({ l: width, a: height });
  };

  const sombra = (opacidade: number) => `rgba(0, 0, 0, ${opacidade})`;

  let desenho = null;
  if (tamanho && tamanho.a >= ALTURA_MINIMA) {
    const { l, a } = tamanho;
    // Rota da partida (esquerda, embaixo) até o destino (direita, no alto).
    const partida: [number, number] = [l * 0.2, a * 0.66];
    const controle: [number, number] = [l * 0.42, a * 0.02];
    const destino: [number, number] = [l * 0.78, a * 0.34];
    const passos = Math.max(10, Math.round(l / 22));
    const pontos = Array.from({ length: passos - 1 }, (_, i) =>
      pontoNaCurva((i + 1) / passos, partida, controle, destino),
    );
    const pino = Math.min(56, a * 0.22);

    desenho = (
      <>
        {/* Serras ao fundo, da mais clara para a mais escura */}
        <View
          style={{
            position: 'absolute',
            width: l * 1.1,
            height: l * 1.1,
            borderRadius: l,
            left: -l * 0.45,
            top: a * 0.5,
            backgroundColor: sombra(0.14),
          }}
        />
        {/* Monólitos: cúpulas de pedra, como as de Quixadá. A base fica escondida
            atrás das serras da frente. */}
        <View
          style={{
            position: 'absolute',
            width: l * 0.22,
            height: a,
            left: l * 0.56,
            top: a * 0.46,
            borderTopLeftRadius: l * 0.11,
            borderTopRightRadius: l * 0.09,
            backgroundColor: sombra(0.2),
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: l * 0.16,
            height: a,
            left: l * 0.74,
            top: a * 0.6,
            borderTopLeftRadius: l * 0.08,
            borderTopRightRadius: l * 0.08,
            backgroundColor: sombra(0.24),
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: l * 0.9,
            height: l * 0.9,
            borderRadius: l,
            right: -l * 0.4,
            top: a * 0.62,
            backgroundColor: sombra(0.22),
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: l * 0.7,
            height: l * 0.7,
            borderRadius: l,
            left: l * 0.12,
            top: a * 0.8,
            backgroundColor: sombra(0.3),
          }}
        />

        {/* Rota tracejada */}
        {pontos.map(([x, y], i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: 7,
              height: 7,
              borderRadius: 4,
              left: x - 3.5,
              top: y - 3.5,
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
            }}
          />
        ))}

        {/* Partida: um anel; destino: o marcador de mapa */}
        <View
          style={{
            position: 'absolute',
            width: 22,
            height: 22,
            borderRadius: 11,
            left: partida[0] - 11,
            top: partida[1] - 11,
            borderWidth: 5,
            borderColor: '#FFFFFF',
          }}
        />
        <View style={{ position: 'absolute', left: destino[0] - pino / 2, top: destino[1] - pino * 0.92 }}>
          <Ionicons name="location" size={pino} color="#FFFFFF" />
        </View>
      </>
    );
  }

  return (
    <View
      onLayout={medir}
      style={{ flex: 1, overflow: 'hidden' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {desenho}
    </View>
  );
}
