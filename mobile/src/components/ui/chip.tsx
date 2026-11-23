import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useCores } from '@/theme/provider';
import { espaco, raio } from '@/theme/tokens';
import { Texto } from './texto';

interface PropsChip {
  rotulo: string;
  ativo?: boolean;
  icone?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  /**
   * Para o leitor de tela: escolha única (um entre vários, como a cidade) ou
   * múltipla (vários ao mesmo tempo, como os interesses).
   */
  selecao?: 'unica' | 'multipla';
}

/** Opção que se marca com um toque. Sem `onPress`, é só um indicador. */
export function Chip({ rotulo, ativo, icone, onPress, selecao = 'unica' }: PropsChip) {
  const cores = useCores();
  const cor = ativo ? cores.primaria : cores.textoSuave;

  return (
    <Pressable
      onPress={onPress}
      role={onPress ? (selecao === 'multipla' ? 'checkbox' : 'radio') : undefined}
      aria-checked={onPress ? Boolean(ativo) : undefined}
      aria-label={rotulo}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: espaco.xs,
        paddingHorizontal: espaco.md,
        paddingVertical: espaco.sm,
        borderRadius: raio.pilula,
        borderWidth: 1,
        backgroundColor: ativo ? cores.primariaSuave : cores.fundoAlt,
        borderColor: ativo ? cores.primaria : cores.borda,
      }}>
      {icone ? <Ionicons name={icone} size={15} color={cor} aria-hidden /> : null}
      <Texto variante="pequeno" peso="medio" cor={cor}>
        {rotulo}
      </Texto>
    </Pressable>
  );
}

/**
 * Chips lado a lado que respondem a uma pergunta. O grupo diz ao leitor de
 * tela qual pergunta é; `multipla` quando dá para marcar várias.
 */
export function GrupoDeOpcoes({
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
