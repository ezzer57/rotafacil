import { Ionicons } from '@expo/vector-icons';
import { useId, type Ref } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { useCores } from '@/theme/provider';
import { espaco, fonte, raio } from '@/theme/tokens';
import { Texto } from './texto';

/** Teclados do iPhone que não têm tecla para fechar. */
const TECLADOS_SEM_RETORNO = new Set(['numeric', 'number-pad', 'decimal-pad', 'phone-pad']);

type Props = TextInputProps & {
  rotulo?: string;
  icone?: keyof typeof Ionicons.glyphMap;
  ref?: Ref<TextInput>;
  /** Para a tela medir onde o campo está e rolar até ele quando o teclado abre. */
  refContainer?: Ref<View>;
  /** Problema com o valor digitado, mostrado embaixo do campo. */
  erro?: string;
};

export function Campo({ rotulo, icone, ref, refContainer, erro, ...props }: Props) {
  const cores = useCores();
  // No iPhone, o teclado numérico não tem tecla de fechar: sem esta barra com
  // "Concluir", o teclado ficava preso cobrindo a tela.
  const precisaBarra = Platform.OS === 'ios' && TECLADOS_SEM_RETORNO.has(props.keyboardType ?? '');
  const idBarra = `teclado-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <View ref={refContainer} style={{ gap: espaco.xs }}>
      {rotulo ? (
        <Texto variante="pequeno" peso="medio" cor={cores.textoSuave}>
          {rotulo}
        </Texto>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: espaco.sm,
          minHeight: 50,
          paddingHorizontal: espaco.lg,
          borderRadius: raio.md,
          borderWidth: 1,
          borderColor: erro ? cores.erro : cores.borda,
          backgroundColor: cores.fundoAlt,
        }}>
        {icone ? <Ionicons name={icone} size={18} color={cores.textoSuave} aria-hidden /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={cores.textoSuave}
          style={{ flex: 1, fontSize: fonte.tamanho.corpo, color: cores.texto }}
          inputAccessoryViewID={precisaBarra ? idBarra : undefined}
          // O rótulo visível também é o nome do campo para o leitor de tela.
          aria-label={rotulo ?? props.placeholder}
          {...props}
        />
      </View>
      {erro ? (
        <View accessible role="alert">
          <Texto variante="micro" cor={cores.erro}>
            {erro}
          </Texto>
        </View>
      ) : null}
      {precisaBarra ? (
        <InputAccessoryView nativeID={idBarra}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              paddingHorizontal: espaco.lg,
              paddingVertical: espaco.sm,
              backgroundColor: cores.superficie,
              borderTopWidth: 1,
              borderTopColor: cores.borda,
            }}>
            <Pressable onPress={Keyboard.dismiss} hitSlop={8} role="button">
              <Texto variante="corpo" peso="semi" cor={cores.primaria}>
                Concluir
              </Texto>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </View>
  );
}
