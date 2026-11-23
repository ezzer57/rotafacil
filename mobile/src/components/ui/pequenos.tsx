/** Componentes pequenos: caixa de marcação, selo e cabeçalho de seção. */

import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useCores } from '@/theme/provider';
import { espaco, raio } from '@/theme/tokens';
import { Texto } from './texto';

/** Aceite explícito: a pessoa marca, nada vem marcado por padrão. */
export function CaixaMarcacao({
  marcada,
  onPress,
  children,
}: {
  marcada: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const cores = useCores();
  return (
    <Pressable
      onPress={onPress}
      role="checkbox"
      aria-checked={marcada}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: espaco.sm }}>
      <Ionicons
        name={marcada ? 'checkbox' : 'square-outline'}
        size={22}
        color={marcada ? cores.primaria : cores.textoSuave}
        aria-hidden
      />
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

/** Etiqueta curta de informação ("A pé · grátis", "4 paradas"). */
export function Selo({
  texto,
  cor,
  fundo,
  icone,
}: {
  texto: string;
  cor?: string;
  fundo?: string;
  icone?: keyof typeof Ionicons.glyphMap;
}) {
  const cores = useCores();
  const corTexto = cor ?? cores.textoSuave;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: espaco.sm,
        paddingVertical: 4,
        borderRadius: raio.pilula,
        backgroundColor: fundo ?? cores.fundoAlt,
      }}>
      {icone ? <Ionicons name={icone} size={12} color={corTexto} aria-hidden /> : null}
      <Texto variante="micro" peso="semi" cor={corTexto}>
        {texto}
      </Texto>
    </View>
  );
}

/** Título de seção com uma ação opcional à direita ("Ver tudo"). */
export function CabecalhoSecao({
  titulo,
  acao,
  onPressAcao,
}: {
  titulo: string;
  acao?: string;
  onPressAcao?: () => void;
}) {
  const cores = useCores();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: espaco.md,
      }}>
      <Texto variante="destaque" peso="forte" accessibilityRole="header">
        {titulo}
      </Texto>
      {acao ? (
        <Pressable onPress={onPressAcao} role="button" aria-label={acao} hitSlop={8}>
          <Texto variante="pequeno" peso="semi" cor={cores.primaria}>
            {acao}
          </Texto>
        </Pressable>
      ) : null}
    </View>
  );
}
