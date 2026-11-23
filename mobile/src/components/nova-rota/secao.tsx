/**
 * Uma pergunta do formulário da Nova rota ("Onde você está?", "O que te
 * interessa?"...), com as opções em chips (GrupoDeOpcoes, na biblioteca).
 */

import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Texto } from '@/components/ui';
import { espaco } from '@/theme/tokens';

export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={{ gap: espaco.md }}>
      <Texto variante="titulo" peso="forte" accessibilityRole="header">
        {titulo}
      </Texto>
      {children}
    </View>
  );
}
