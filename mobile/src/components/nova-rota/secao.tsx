/**
 * Uma pergunta do formulário da Nova rota ("Onde você está?", "O que te
 * interessa?"...), com as opções em chips. O grupo de opções diz ao leitor de
 * tela qual pergunta ele responde.
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

/** Opções lado a lado; `multipla` quando dá para marcar várias. */
export function Opcoes({
  rotulo,
  multipla,
  children,
}: {
  rotulo: string;
  multipla?: boolean;
  children: ReactNode;
}) {
  return (
    <View
      role={multipla ? 'group' : 'radiogroup'}
      aria-label={rotulo}
      style={{ flexDirection: 'row', gap: espaco.sm, flexWrap: 'wrap' }}>
      {children}
    </View>
  );
}
