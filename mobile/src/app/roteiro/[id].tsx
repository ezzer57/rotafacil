/**
 * Roteiro gerado (UI-06).
 *
 * Mostra a linha do tempo das paradas com o custo de cada deslocamento, a
 * bandeira tarifária aplicada e, quando há teto de gasto, o consumo do
 * orçamento. É a tela que materializa as hipóteses 1 e 2 do trabalho.
 *
 * Esta tela cuida dos dados (carregar, ajustar, check-in), dos estados de
 * carregamento e de erro e da disposição: no navegador largo, o mapa numa
 * coluna ao lado da lista; no celular, numa caixa vertical no meio dela. As
 * partes estão em src/components/roteiro.
 *
 * Três recursos existem especificamente para a defesa:
 *  - o controle de orçamento, que põe ou tira o teto e refaz a seleção ao vivo;
 *  - o "como calculamos", que abre a memória de cálculo da tarifa;
 *  - o painel de processamento, com as métricas do algoritmo.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { KeyboardAvoidingView, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvisoDeErro } from '@/components/aviso-de-erro';
import MapaRoteiro, { type ParadaMapa } from '@/components/mapa';
import { LARGURA_DUAS_COLUNAS, useAlturaDoMapa } from '@/components/mapa/altura';
import { ControleDoTeto } from '@/components/roteiro/controle-do-teto';
import { PainelDeProcessamento, PontosDescartados } from '@/components/roteiro/descartados';
import { FalhaAoCarregar } from '@/components/roteiro/falha-ao-carregar';
import { ParadaDoRoteiro } from '@/components/roteiro/parada';
import { ResumoDoRoteiro } from '@/components/roteiro/resumo';
import { EstadoVazio, Esqueleto, Texto } from '@/components/ui';
import type { Roteiro } from '@/domain/types';
import { useAjustarRoteiro, useRoteiro } from '@/hooks/use-rotafacil';
import { useRolarAteCampo } from '@/hooks/use-teclado';
import { useCores } from '@/theme/provider';
import { espaco, raio } from '@/theme/tokens';

/** O que a legenda sob o mapa diz sobre a origem das distâncias. */
const ORIGEM_DAS_MEDIDAS = {
  ruas: 'Distâncias e tempos medidos pelas ruas (dados do OpenStreetMap).',
  parcial:
    'Parte dos trechos foi medida pelas ruas; o restante é estimado em linha reta (linhas claras no mapa).',
  estimada:
    'Distâncias estimadas em linha reta (× 1,3), sem consulta às ruas. As linhas do mapa são retas entre as paradas.',
} as const;

export default function TelaRoteiro() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: roteiro, isLoading, error, refetch } = useRoteiro(id);

  if (isLoading) {
    return (
      <View
        style={{ padding: espaco.lg, gap: espaco.md }}
        aria-busy
        aria-label="Carregando o roteiro">
        <Esqueleto altura={120} arredondado={raio.lg} />
        <Esqueleto altura={90} arredondado={raio.lg} />
        <Esqueleto altura={90} arredondado={raio.lg} />
      </View>
    );
  }

  if (error) {
    return (
      <FalhaAoCarregar
        erro={error}
        onTentarDeNovo={() => void refetch()}
        onVoltar={() => router.replace('/')}
      />
    );
  }

  if (!roteiro) return <EstadoVazio titulo="Roteiro não encontrado" icone="alert-circle-outline" />;

  return <ConteudoDoRoteiro roteiro={roteiro} />;
}

function ConteudoDoRoteiro({ roteiro }: { roteiro: Roteiro }) {
  const { remover, substituir, ajustarOrcamento, registrarVisita, desfazerVisita } =
    useAjustarRoteiro(roteiro.id);
  const cores = useCores();
  const { width } = useWindowDimensions();
  const duasColunas = width >= LARGURA_DUAS_COLUNAS;
  const alturaMapa = useAlturaDoMapa(0.62, 360, 620);
  const insets = useSafeAreaInsets();
  const alturaCabecalho = useHeaderHeight();
  const rolagem = useRef<ScrollView>(null);
  const conteudo = useRef<View>(null);
  // O campo do valor pago fica no meio da lista: ao focar, a tela rola até ele.
  const rolarAteCampo = useRolarAteCampo(rolagem, conteudo);

  // Estável entre renderizações: um array novo a cada render recarregaria o
  // mapa inteiro.
  const paradasDoMapa = useMemo(
    () =>
      roteiro.itens.map<ParadaMapa>((item) => ({
        id: item.ponto.id,
        nome: item.ponto.nome,
        ordem: item.ordem,
        lat: item.ponto.coordenada.lat,
        lng: item.ponto.coordenada.lng,
        modalAteAqui: item.trechoAteAqui?.modal ?? null,
        trajetoAteAqui: item.trechoAteAqui?.trajeto ?? null,
        visitada: item.visitado || item.visita != null,
      })),
    [roteiro.itens],
  );

  const ajustando = remover.isPending || substituir.isPending || ajustarOrcamento.isPending;
  const registrando = registrarVisita.isPending || desfazerVisita.isPending;
  const visitadas = roteiro.itens.some((item) => item.visita);
  const semTeto = roteiro.orcamento == null;

  // A última ação que falhou, para avisar; antes, a falha passava calada.
  const acoes = [remover, substituir, ajustarOrcamento, registrarVisita, desfazerVisita];
  const falha = acoes.find((acao) => acao.isError);

  const mapa = (altura: number | 'preencher') => (
    <>
      <MapaRoteiro origem={roteiro.preferencias.origem} paradas={paradasDoMapa} altura={altura} />
      <Texto variante="micro" cor={cores.textoSuave}>
        {ORIGEM_DAS_MEDIDAS[roteiro.diagnostico.rotas ?? 'estimada']}
        {visitadas ? ' O trecho até cada parada em que você chegou sai do mapa.' : ''}
      </Texto>
    </>
  );

  const lista = (comMapa: boolean): ReactNode => (
    <>
      <ResumoDoRoteiro roteiro={roteiro} />
      <ControleDoTeto
        roteiroId={roteiro.id}
        orcamento={roteiro.orcamento}
        recalculando={ajustarOrcamento.isPending}
        bloqueado={ajustando}
        onMudarTeto={(valor) => ajustarOrcamento.mutateAsync(valor)}
      />
      {comMapa ? <View style={{ gap: espaco.sm }}>{mapa(alturaMapa)}</View> : null}

      <View style={{ gap: espaco.md }}>
        <Texto variante="destaque" peso="forte" accessibilityRole="header">
          Seu percurso
        </Texto>

        {falha?.error ? (
          <AvisoDeErro
            mensagem={falha.error.message}
            onFechar={() => acoes.forEach((acao) => acao.reset())}
          />
        ) : null}

        {roteiro.itens.map((item) => (
          <ParadaDoRoteiro
            key={item.ponto.id}
            item={item}
            ocupado={ajustando}
            registrando={registrando}
            onRemover={() => remover.mutate(item.ponto.id)}
            onTrocar={() => substituir.mutate(item.ponto.id)}
            onCheckin={(custoRegistrado) =>
              registrarVisita.mutate({ pontoId: item.ponto.id, custoRegistrado })
            }
            onDesfazer={() => desfazerVisita.mutate(item.ponto.id)}
            onFocarCampo={rolarAteCampo}
          />
        ))}

        {roteiro.itens.length === 0 ? (
          <EstadoVazio
            icone={semTeto ? 'time-outline' : 'wallet-outline'}
            titulo={semTeto ? 'Nada coube no tempo disponível' : 'Nada coube no orçamento'}
            descricao={
              semTeto
                ? 'Aumente o tempo livre ou escolha outro horário de início para que o algoritmo consiga montar um roteiro.'
                : 'Aumente o valor disponível ou o tempo livre para que o algoritmo consiga montar um roteiro.'
            }
          />
        ) : null}
      </View>

      <PontosDescartados descartados={roteiro.descartados} />
      <PainelDeProcessamento diagnostico={roteiro.diagnostico} />
    </>
  );

  const rolavel = (comMapa: boolean) => (
    <ScrollView
      ref={rolagem}
      innerViewRef={conteudo as RefObject<View>}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      style={{ flex: 1, backgroundColor: cores.fundo }}
      contentContainerStyle={{
        padding: espaco.lg,
        gap: espaco.lg,
        paddingBottom: 60 + insets.bottom,
      }}>
      {lista(comMapa)}
    </ScrollView>
  );

  if (duasColunas) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: cores.fundo }}>
        <View
          style={{
            width: '46%',
            maxWidth: 820,
            padding: espaco.lg,
            paddingRight: 0,
            gap: espaco.sm,
          }}>
          {mapa('preencher')}
        </View>
        {rolavel(false)}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={alturaCabecalho}
      style={{ flex: 1, backgroundColor: cores.fundo }}>
      {rolavel(true)}
    </KeyboardAvoidingView>
  );
}
