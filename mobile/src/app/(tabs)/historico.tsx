/**
 * Histórico de roteiros (UI-08): cada viagem com as paradas visitadas e o que
 * foi pago. Cada roteiro pode ser apagado, com confirmação.
 */

import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CartaoDoRoteiro } from '@/components/historico/cartao-do-roteiro';
import { AvisoDeErro, ErroAoCarregar, Esqueleto, EstadoVazio, Texto } from '@/components/ui';
import { useExcluirRoteiro, useHistorico } from '@/hooks/use-rotafacil';
import { useCores } from '@/theme/provider';
import { espaco, raio } from '@/theme/tokens';

export default function TelaHistorico() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useHistorico();
  const excluir = useExcluirRoteiro();
  const cores = useCores();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: espaco.lg, gap: espaco.md }}>
        <Texto variante="display" peso="forte" accessibilityRole="header">
          Suas viagens
        </Texto>

        {excluir.error ? (
          <AvisoDeErro mensagem={excluir.error.message} onFechar={() => excluir.reset()} />
        ) : null}

        {isLoading ? (
          <View style={{ gap: espaco.sm }} aria-busy aria-label="Carregando as viagens">
            <Esqueleto altura={88} arredondado={raio.lg} />
            <Esqueleto altura={88} arredondado={raio.lg} />
          </View>
        ) : error ? (
          // Antes, uma falha de rede aparecia como "Sem viagens registradas".
          <ErroAoCarregar
            erro={error}
            titulo="Não foi possível carregar as viagens"
            onTentarDeNovo={() => void refetch()}
          />
        ) : data?.length ? (
          data.map((item) => (
            <CartaoDoRoteiro
              key={item.id}
              resumo={item}
              detalhado
              onAbrir={() => router.push(`/roteiro/${item.id}`)}
              onApagar={() => excluir.mutate(item.id)}
              apagando={excluir.isPending && excluir.variables === item.id}
            />
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
