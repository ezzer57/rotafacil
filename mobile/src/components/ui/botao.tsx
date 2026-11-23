import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { useCores } from '@/theme/provider';
import { espaco, raio } from '@/theme/tokens';
import { Texto } from './texto';

export interface BotaoProps {
  titulo: string;
  onPress?: () => void;
  variante?: 'principal' | 'secundario' | 'contorno' | 'texto';
  icone?: keyof typeof Ionicons.glyphMap;
  carregando?: boolean;
  desabilitado?: boolean;
  largura?: 'total' | 'auto';
  style?: StyleProp<ViewStyle>;
  /**
   * O que o leitor de tela diz, quando o título sozinho não basta: numa lista
   * de paradas, "Remover" precisa dizer qual parada.
   */
  rotuloAcessivel?: string;
}

export function Botao({
  titulo,
  onPress,
  variante = 'principal',
  icone,
  carregando,
  desabilitado,
  largura = 'total',
  style,
  rotuloAcessivel,
}: BotaoProps) {
  const cores = useCores();

  const paleta = {
    principal: { fundo: cores.tinta, texto: cores.tintaTexto, borda: 'transparent' },
    secundario: { fundo: cores.primaria, texto: cores.textoSobrePrimaria, borda: 'transparent' },
    contorno: { fundo: 'transparent', texto: cores.texto, borda: cores.bordaForte },
    texto: { fundo: 'transparent', texto: cores.primaria, borda: 'transparent' },
  }[variante];

  const inativo = desabilitado || carregando;

  return (
    <Pressable
      onPress={inativo ? undefined : onPress}
      // disabled, e não só aria-disabled: no navegador, o Pressable só repassa
      // o estado de desabilitado ao HTML por esta prop.
      disabled={inativo}
      role="button"
      aria-label={rotuloAcessivel ?? titulo}
      aria-disabled={inativo}
      aria-busy={carregando}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: espaco.sm,
          // Altura mínima, e não fixa: com a fonte do aparelho aumentada, o
          // botão cresce em vez de cortar o texto.
          minHeight: 50,
          paddingVertical: 6,
          paddingHorizontal: espaco.xl,
          borderRadius: raio.md,
          borderWidth: 1,
          backgroundColor: paleta.fundo,
          borderColor: paleta.borda,
          opacity: inativo ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: largura === 'total' ? 'stretch' : 'flex-start',
        },
        style,
      ]}>
      {carregando ? (
        <ActivityIndicator color={paleta.texto} />
      ) : (
        <>
          {icone ? <Ionicons name={icone} size={18} color={paleta.texto} aria-hidden /> : null}
          <Texto variante="corpo" peso="semi" cor={paleta.texto}>
            {titulo}
          </Texto>
        </>
      )}
    </Pressable>
  );
}
