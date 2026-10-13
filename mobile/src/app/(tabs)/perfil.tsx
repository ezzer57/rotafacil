/** Perfil e configurações (UI-09, versão inicial). */

import { Ionicons } from '@expo/vector-icons';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao, Cartao, Campo, Chip, Texto } from '@/components/ui';
import { useSair, useUsuario } from '@/hooks/use-rotafacil';
import { useTema, type ModoTema } from '@/theme/provider';
import { espaco, raio } from '@/theme/tokens';

const OPCOES_TEMA: { modo: ModoTema; rotulo: string; icone: 'sunny' | 'moon' | 'phone-portrait' }[] = [
  { modo: 'claro', rotulo: 'Claro', icone: 'sunny' },
  { modo: 'escuro', rotulo: 'Escuro', icone: 'moon' },
  { modo: 'sistema', rotulo: 'Sistema', icone: 'phone-portrait' },
];

export default function TelaPerfil() {
  const { data: usuario } = useUsuario();
  const sair = useSair();
  const { cores, modo, definirModo } = useTema();

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

        <View style={{ gap: espaco.md }}>
          <Campo rotulo="Nome" defaultValue={usuario?.nome} placeholder="Seu nome" />
          <Campo rotulo="E-mail" defaultValue={usuario?.email} placeholder="seu@email.com" />
          <Campo rotulo="Número de celular" placeholder="(85) 90000-0000" keyboardType="phone-pad" />
          <Botao titulo="Salvar mudanças" variante="secundario" />
        </View>

        {/* Exigência da LGPD: o usuário precisa conseguir apagar os dados. */}
        <Cartao style={{ backgroundColor: cores.erroSuave, borderColor: cores.erroSuave }}>
          <Texto variante="pequeno" peso="semi" cor={cores.erro}>
            Privacidade
          </Texto>
          <Texto variante="micro" cor={cores.textoSuave} style={{ marginTop: 4, marginBottom: espaco.md }}>
            Você pode apagar seu histórico de roteiros e dados de localização a qualquer momento.
          </Texto>
          <Botao titulo="Excluir meus dados" variante="contorno" icone="trash-outline" />
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
