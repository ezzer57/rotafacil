/**
 * Marca do RotaFácil: a logo (seta de navegação com o rastro da rota) e,
 * se pedido, o nome ao lado.
 *
 * A mesma imagem gera o ícone do app e a tela de abertura (assets/images,
 * a partir do script descrito no README do app).
 */

import { Image } from 'expo-image';
import { View } from 'react-native';

import { Texto } from '@/components/ui';

/** Azul da marca: fundo da logo, do ícone e da tela de boas-vindas. */
export const AZUL_DA_MARCA = '#3E58DE';

const LOGO = require('../../assets/images/logo.png');

export function MarcaRotaFacil({
  tamanho = 56,
  comNome = false,
  corDoNome,
}: {
  tamanho?: number;
  comNome?: boolean;
  corDoNome?: string;
}) {
  const logo = (
    <Image
      source={LOGO}
      style={{ width: tamanho, height: tamanho }}
      contentFit="contain"
      accessibilityIgnoresInvertColors
      accessible={!comNome}
      accessibilityLabel={comNome ? undefined : 'RotaFácil'}
    />
  );

  if (!comNome) return logo;

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: tamanho * 0.28 }}
      accessible
      accessibilityLabel="RotaFácil">
      {logo}
      <Texto
        variante="titulo"
        peso="forte"
        cor={corDoNome}
        style={{ fontSize: tamanho * 0.5, lineHeight: tamanho * 0.62 }}>
        RotaFácil
      </Texto>
    </View>
  );
}
