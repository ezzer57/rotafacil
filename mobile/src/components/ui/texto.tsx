import type { ReactNode } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { useCores } from '@/theme/provider';
import { fonte } from '@/theme/tokens';

export interface TextoProps {
  children: ReactNode;
  variante?: 'display' | 'titulo' | 'destaque' | 'corpo' | 'pequeno' | 'micro';
  cor?: string;
  peso?: 'normal' | 'medio' | 'semi' | 'forte';
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  /** "header" em títulos, para o leitor de tela anunciar como cabeçalho. */
  accessibilityRole?: 'header' | 'text';
}

/** Todo texto do app: tamanho e peso vêm dos tokens, a cor da paleta ativa. */
export function Texto({
  children,
  variante = 'corpo',
  cor,
  peso = 'normal',
  style,
  numberOfLines,
  accessibilityRole,
}: TextoProps) {
  const cores = useCores();
  return (
    <Text
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      style={[
        {
          fontSize: fonte.tamanho[variante],
          color: cor ?? cores.texto,
          fontWeight: fonte.peso[peso],
        },
        style,
      ]}>
      {children}
    </Text>
  );
}
