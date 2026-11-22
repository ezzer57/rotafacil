/**
 * Aviso de que uma ação falhou (trocar, remover, check-in...), com a mensagem
 * da API e um botão para dispensar. Antes, essas falhas passavam caladas.
 */

import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Botao, Texto } from '@/components/ui';
import { useCores } from '@/theme/provider';
import { espaco, raio } from '@/theme/tokens';

export function AvisoDeErro({ mensagem, onFechar }: { mensagem: string; onFechar: () => void }) {
  const cores = useCores();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: espaco.sm,
        padding: espaco.md,
        borderRadius: raio.md,
        backgroundColor: cores.erroSuave,
      }}>
      <Ionicons name="alert-circle" size={18} color={cores.erro} aria-hidden />
      {/* Só a mensagem é o alerta: o botão continua um elemento à parte. */}
      <View accessible role="alert" aria-live="assertive" style={{ flex: 1 }}>
        <Texto variante="pequeno" cor={cores.erro}>
          {mensagem}
        </Texto>
      </View>
      <Botao
        titulo="Ok"
        rotuloAcessivel="Dispensar o aviso"
        variante="texto"
        largura="auto"
        onPress={onFechar}
        style={{ minHeight: 32, paddingHorizontal: espaco.sm }}
      />
    </View>
  );
}
