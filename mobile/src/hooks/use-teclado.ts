/**
 * Ajudas para o teclado não cobrir a tela.
 *
 * O Expo Go não inclui o react-native-keyboard-controller, então o projeto
 * usa só o que vem no React Native: KeyboardAvoidingView nas telas, estes
 * hooks para esconder rodapés flutuantes e rolar até o campo, e uma barra
 * "Concluir" no teclado numérico do iPhone (ver Campo em components/ui).
 */

import { useCallback, useEffect, useState, type RefObject } from 'react';
import { Keyboard, Platform, type ScrollView, type View } from 'react-native';

/** Se o teclado está aberto. No iPhone, avisa antes da animação, para o rodapé sumir junto. */
export function useTecladoVisivel(): boolean {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const abrir = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const fechar = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const aoAbrir = Keyboard.addListener(abrir, () => setVisivel(true));
    const aoFechar = Keyboard.addListener(fechar, () => setVisivel(false));
    return () => {
      aoAbrir.remove();
      aoFechar.remove();
    };
  }, []);

  return visivel;
}

/** Quanto do campo fica acima dele na tela, para o rótulo continuar visível. */
const FOLGA_ACIMA_DO_CAMPO = 96;
/** Tempo para o teclado abrir e a tela encolher antes de medir. */
const ESPERA_DO_TECLADO_MS = Platform.OS === 'ios' ? 320 : 180;

/**
 * Rola a tela até um campo quando ele ganha foco, para o teclado não o
 * cobrir. `conteudo` é o `innerViewRef` da ScrollView.
 */
export function useRolarAteCampo(
  rolagem: RefObject<ScrollView | null>,
  conteudo: RefObject<View | null>,
) {
  return useCallback(
    (campo: View | null) => {
      if (!campo) return;
      setTimeout(() => {
        const base = conteudo.current;
        if (!base || !rolagem.current) return;
        campo.measureLayout(
          base,
          (_x, y) =>
            rolagem.current?.scrollTo({ y: Math.max(0, y - FOLGA_ACIMA_DO_CAMPO), animated: true }),
          () => {},
        );
      }, ESPERA_DO_TECLADO_MS);
    },
    [rolagem, conteudo],
  );
}
