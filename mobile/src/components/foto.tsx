/**
 * Foto de um lugar, com reserva quando não há foto dele.
 *
 * As fotos vêm do Wikimedia Commons, sempre com licença livre, e o crédito
 * (autor e licença) aparece na parada do roteiro. Lugar sem foto livre mostra
 * um ícone neutro, em vez de uma imagem qualquer que não é dele.
 */

import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageStyle } from 'expo-image';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useCores } from '@/theme/provider';

export function FotoDoLugar({
  uri,
  style,
  tamanhoIcone = 22,
}: {
  uri: string | null | undefined;
  style: StyleProp<ViewStyle>;
  tamanhoIcone?: number;
}) {
  const cores = useCores();

  if (!uri) {
    return (
      <View
        style={[
          { backgroundColor: cores.fundoAlt, alignItems: 'center', justifyContent: 'center' },
          style,
        ]}>
        <Ionicons name="image-outline" size={tamanhoIcone} color={cores.textoSuave} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style as StyleProp<ImageStyle>}
      contentFit="cover"
      transition={150}
    />
  );
}
