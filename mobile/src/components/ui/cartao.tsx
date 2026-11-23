import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useCores } from '@/theme/provider';
import { espaco, raio, sombra } from '@/theme/tokens';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Cartão que se toca (abre um roteiro, por exemplo) vira um botão. */
  onPress?: () => void;
  /** O que o leitor de tela diz do cartão tocável; sem ele, lê o conteúdo. */
  rotuloAcessivel?: string;
  padding?: number;
}

export function Cartao({ children, style, onPress, rotuloAcessivel, padding = espaco.lg }: Props) {
  const cores = useCores();
  const conteudo = (
    <View
      style={[
        {
          backgroundColor: cores.superficie,
          borderRadius: raio.lg,
          borderWidth: 1,
          borderColor: cores.borda,
          padding,
          ...sombra.cartao,
        },
        style,
      ]}>
      {children}
    </View>
  );
  if (!onPress) return conteudo;

  return (
    <Pressable
      onPress={onPress}
      role="button"
      aria-label={rotuloAcessivel}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      {conteudo}
    </Pressable>
  );
}
