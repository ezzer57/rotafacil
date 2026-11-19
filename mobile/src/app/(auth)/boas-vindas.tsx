/**
 * Boas-vindas: a primeira tela de quem ainda não entrou.
 *
 * Na parte de cima, a marca, o que o aplicativo faz e uma ilustração; embaixo,
 * os dois caminhos: criar conta ou entrar. A ilustração encolhe ou some em
 * celular pequeno, para os botões nunca ficarem fora da tela.
 */

import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { IlustracaoBoasVindas } from '@/components/ilustracao-boas-vindas';
import { AZUL_DA_MARCA, MarcaRotaFacil } from '@/components/marca';
import { Botao, Texto } from '@/components/ui';
import { useCores } from '@/theme/provider';
import { espaco } from '@/theme/tokens';

/** No navegador largo, o conteúdo fica numa coluna, em vez de esticar. */
const LARGURA_MAXIMA = 520;

export default function TelaBoasVindas() {
  const router = useRouter();
  const cores = useCores();
  const { bottom } = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: AZUL_DA_MARCA }}>
      {/* Texto claro na barra de status, sobre o azul. */}
      <StatusBar style="light" />

      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            width: '100%',
            maxWidth: LARGURA_MAXIMA,
            alignSelf: 'center',
            paddingHorizontal: espaco.xl,
            paddingTop: espaco.xl,
            gap: espaco.lg,
          }}>
          <MarcaRotaFacil tamanho={52} comNome corDoNome="#FFFFFF" />

          <Texto
            variante="display"
            peso="forte"
            cor="#FFFFFF"
            accessibilityRole="header"
            style={{ fontSize: 30, lineHeight: 38, marginTop: espaco.md }}>
            Seu roteiro pela cidade, no seu tempo e no seu bolso.
          </Texto>
          <Texto variante="corpo" cor="rgba(255, 255, 255, 0.88)" style={{ lineHeight: 24 }}>
            Diga o que gosta de visitar e quanto tempo tem. O RotaFácil monta o percurso pelas
            ruas e mostra o caminho no mapa.
          </Texto>
        </View>

        {/* Ocupa o espaço que sobra; some se não couber. */}
        <View style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: LARGURA_MAXIMA, alignSelf: 'center' }}>
          <IlustracaoBoasVindas />
        </View>
      </SafeAreaView>

      <View
        style={{
          backgroundColor: cores.superficie,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingTop: espaco.xl,
          paddingHorizontal: espaco.xl,
          paddingBottom: espaco.lg + Math.max(bottom, espaco.sm),
        }}>
        <View
          style={{ width: '100%', maxWidth: LARGURA_MAXIMA, alignSelf: 'center', gap: espaco.md }}>
          <Botao
            titulo="Criar conta"
            variante="secundario"
            onPress={() => router.push('/cadastro')}
          />
          <Botao
            titulo="Já tenho conta"
            variante="contorno"
            onPress={() => router.push('/login')}
          />
        </View>
      </View>
    </View>
  );
}
