/** Histórico de roteiros (UI-08, versão inicial). */

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cartao, Esqueleto, EstadoVazio, Texto } from '@/components/ui';
import { formatarDataCurta, formatarReais } from '@/domain/format';
import { useHistorico } from '@/hooks/use-rotafacil';
import { useCores } from '@/theme/provider';
import { espaco, raio } from '@/theme/tokens';

export default function TelaHistorico() {
  const router = useRouter();
  const { data, isLoading } = useHistorico();
  const cores = useCores();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: espaco.lg, gap: espaco.md }}>
        <Texto variante="display" peso="forte">
          Suas viagens
        </Texto>

        {isLoading ? (
          <View style={{ gap: espaco.sm }}>
            <Esqueleto altura={88} arredondado={raio.lg} />
            <Esqueleto altura={88} arredondado={raio.lg} />
          </View>
        ) : data?.length ? (
          data.map((item) => (
            <Cartao key={item.id} padding={espaco.md} onPress={() => router.push(`/roteiro/${item.id}`)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.md }}>
                <Image
                  source={{ uri: item.capaUrl ?? undefined }}
                  style={{ width: 64, height: 64, borderRadius: raio.md, backgroundColor: cores.fundoAlt }}
                  contentFit="cover"
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Texto variante="corpo" peso="semi">
                    {item.cidadeNome}
                  </Texto>
                  <Texto variante="pequeno" cor={cores.textoSuave}>
                    {item.totalPontos} paradas · {formatarDataCurta(item.criadoEm)}
                  </Texto>
                  <Texto variante="pequeno" peso="semi" cor={cores.primaria}>
                    {formatarReais(item.custoEstimado)}
                  </Texto>
                </View>
              </View>
            </Cartao>
          ))
        ) : (
          <EstadoVazio
            icone="time-outline"
            titulo="Sem viagens registradas"
            descricao="Os roteiros que você gerar aparecem aqui, com os pontos visitados e os custos."
            acao="Gerar um roteiro"
            onPressAcao={() => router.push('/nova-rota')}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
