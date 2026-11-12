/** Perfil e configurações (UI-09). */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao, Cartao, Chip, Texto } from '@/components/ui';
import { useExcluirConta, useSair, useUsuario } from '@/hooks/use-rotafacil';
import { useTema, type ModoTema } from '@/theme/provider';
import { espaco, raio } from '@/theme/tokens';

const OPCOES_TEMA: { modo: ModoTema; rotulo: string; icone: 'sunny' | 'moon' | 'phone-portrait' }[] = [
  { modo: 'claro', rotulo: 'Claro', icone: 'sunny' },
  { modo: 'escuro', rotulo: 'Escuro', icone: 'moon' },
  { modo: 'sistema', rotulo: 'Sistema', icone: 'phone-portrait' },
];

export default function TelaPerfil() {
  const router = useRouter();
  const { data: usuario } = useUsuario();
  const sair = useSair();
  const excluirConta = useExcluirConta();
  const { cores, modo, definirModo } = useTema();
  // Apagar a conta não tem volta, então o primeiro toque só pede confirmação.
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: espaco.lg, gap: espaco.lg }}>
        <View style={{ alignItems: 'center', gap: espaco.sm }}>
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: raio.pilula,
              backgroundColor: cores.primariaSuave,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="person" size={34} color={cores.primaria} />
          </View>
          <Texto variante="titulo" peso="forte">
            {usuario?.nome ?? 'Visitante'}
          </Texto>
          <Texto variante="pequeno" cor={cores.textoSuave}>
            {usuario?.email ?? 'não autenticado'}
          </Texto>
        </View>

        {/* -------------------------------------------------- aparencia */}
        <Cartao>
          <Texto variante="pequeno" peso="semi">
            Aparência
          </Texto>
          <Texto variante="micro" cor={cores.textoSuave} style={{ marginTop: 4, marginBottom: espaco.md }}>
            Escolha o tema do aplicativo. A opção Sistema acompanha a configuração do aparelho.
          </Texto>
          <View style={{ flexDirection: 'row', gap: espaco.sm }}>
            {OPCOES_TEMA.map((opcao) => (
              <Chip
                key={opcao.modo}
                rotulo={opcao.rotulo}
                icone={opcao.icone}
                ativo={modo === opcao.modo}
                onPress={() => definirModo(opcao.modo)}
              />
            ))}
          </View>
        </Cartao>

        {/* Exigência da LGPD (art. 18, VI): o usuário precisa conseguir apagar os dados. */}
        <Cartao style={{ backgroundColor: cores.erroSuave, borderColor: cores.erroSuave }}>
          <Texto variante="pequeno" peso="semi" cor={cores.erro}>
            Privacidade
          </Texto>
          <Botao
            titulo="Ler a Política de Privacidade"
            variante="texto"
            icone="document-text-outline"
            largura="auto"
            onPress={() => router.push('/privacidade')}
            style={{ height: 32, paddingHorizontal: 0, alignSelf: 'flex-start' }}
          />
          <Texto variante="micro" cor={cores.textoSuave} style={{ marginTop: 4, marginBottom: espaco.md }}>
            {confirmandoExclusao
              ? 'Tem certeza? A conta, os roteiros, as visitas e os pontos de partida serão apagados de vez. Não dá para desfazer.'
              : 'Você pode apagar sua conta e todos os seus dados (roteiros, visitas e pontos de partida) a qualquer momento.'}
          </Texto>
          {confirmandoExclusao ? (
            <View style={{ flexDirection: 'row', gap: espaco.sm }}>
              <Botao
                titulo="Apagar tudo"
                icone="trash-outline"
                largura="auto"
                carregando={excluirConta.isPending}
                onPress={() => excluirConta.mutate()}
                style={{ paddingHorizontal: espaco.lg }}
              />
              <Botao
                titulo="Cancelar"
                variante="texto"
                largura="auto"
                desabilitado={excluirConta.isPending}
                onPress={() => setConfirmandoExclusao(false)}
              />
            </View>
          ) : (
            <Botao
              titulo="Excluir minha conta e meus dados"
              variante="contorno"
              icone="trash-outline"
              onPress={() => setConfirmandoExclusao(true)}
            />
          )}
          {excluirConta.isError ? (
            <Texto variante="micro" cor={cores.erro} style={{ marginTop: espaco.sm }}>
              {(excluirConta.error as Error).message}
            </Texto>
          ) : null}
        </Cartao>

        <Botao
          titulo="Sair da conta"
          variante="texto"
          icone="log-out-outline"
          carregando={sair.isPending}
          onPress={() => sair.mutate()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
