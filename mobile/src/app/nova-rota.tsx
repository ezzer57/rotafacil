/**
 * Nova rota (UI-05) - o núcleo do trabalho.
 *
 * Coleta as entradas do algoritmo: posição de partida, cidade, categorias de
 * interesse, teto de gasto (opcional), tempo disponível e horário de início.
 *
 * A posição vem do GPS do aparelho e aparece num mapa, com a margem de erro.
 * O usuário pode corrigir o ponto de partida tocando no mapa ou escolher o
 * centro da cidade. Quando a localização não está disponível - permissão
 * negada, GPS desligado, aparelho sem sinal ou usuário fora das cidades
 * atendidas -, o roteiro parte do centro da cidade escolhida, e a tela diz
 * isso com todas as letras em vez de fingir que sabe onde a pessoa está.
 *
 * As regras ficam em src/domain (partida, inicio, teto) e as partes da tela
 * em src/components/nova-rota.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useMemo, useRef, useState, type RefObject } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartaoLocalizacao } from '@/components/nova-rota/cartao-localizacao';
import { EscolhaDaPartida } from '@/components/nova-rota/escolha-da-partida';
import { EscolhaDoHorario } from '@/components/nova-rota/escolha-do-horario';
import { EscolhaDoTeto } from '@/components/nova-rota/escolha-do-teto';
import { ResumoDoPedido } from '@/components/nova-rota/resumo-do-pedido';
import { Secao } from '@/components/nova-rota/secao';
import { AvisoDeErro, Botao, Chip, GrupoDeOpcoes } from '@/components/ui';
import { formatarDuracao, iconeCategoria, rotuloCategoria } from '@/domain/format';
import { inicioPrevisto } from '@/domain/inicio';
import { decidirPartida } from '@/domain/partida';
import { lerTeto } from '@/domain/teto';
import type { CategoriaPOI, Coordenada } from '@/domain/types';
import { useCidades, useGerarRoteiro } from '@/hooks/use-rotafacil';
import { useLocalizacao } from '@/hooks/use-localizacao';
import { useRolarAteCampo, useTecladoVisivel } from '@/hooks/use-teclado';
import { useCores } from '@/theme/provider';
import { espaco } from '@/theme/tokens';

const CATEGORIAS: CategoriaPOI[] = [
  'cultura',
  'natureza',
  'gastronomia',
  'compras',
  'religioso',
  'vidaNoturna',
];

const TEMPOS = [120, 240, 360, 480];

export default function TelaNovaRota() {
  const router = useRouter();
  const { cidadeId: cidadeParam } = useLocalSearchParams<{ cidadeId?: string }>();
  const { data: cidades } = useCidades();
  const gerar = useGerarRoteiro();
  const cores = useCores();
  const localizacao = useLocalizacao();
  const insets = useSafeAreaInsets();
  const alturaCabecalho = useHeaderHeight();
  const tecladoAberto = useTecladoVisivel();
  const rolagem = useRef<ScrollView>(null);
  const conteudo = useRef<View>(null);
  const rolarAteCampo = useRolarAteCampo(rolagem, conteudo);

  /** Cidade escolhida pelo usuário; null enquanto ele não escolhe. */
  const [cidadeEscolhida, setCidadeEscolhida] = useState<string | null>(cidadeParam ?? null);
  const [categorias, setCategorias] = useState<CategoriaPOI[]>(['natureza', 'gastronomia']);
  // Vazio é "sem limite", o padrão: o usuário só define um teto se quiser.
  const [textoDoTeto, setTextoDoTeto] = useState('');
  const [tempoMin, setTempoMin] = useState(240);
  const [horaInicio, setHoraInicio] = useState<number | null>(null);
  /** Ponto que o usuário marcou no mapa; tem prioridade sobre o GPS. */
  const [partidaManual, setPartidaManual] = useState<Coordenada | null>(null);
  const [preferirCentro, setPreferirCentro] = useState(false);

  // 'solicitando' com coordenada é uma atualização: a posição anterior vale.
  const leituraValida = localizacao.estado === 'obtida' || localizacao.estado === 'solicitando';
  const posicao = leituraValida ? localizacao.coordenada : null;

  const partida = useMemo(
    () => decidirPartida({ cidades, cidadeEscolhida, posicao, partidaManual, preferirCentro }),
    [cidades, cidadeEscolhida, posicao, partidaManual, preferirCentro],
  );
  const { cidade, origem, modo, longeDemais } = partida;

  const teto = lerTeto(textoDoTeto);
  const inicio = inicioPrevisto(horaInicio);
  const podeGerar = !longeDemais && teto.erro == null && cidade != null && origem != null;

  /** Ponto marcado no mapa pertence à cidade em que foi marcado. */
  function trocarCidade(id: string) {
    setCidadeEscolhida(id);
    setPartidaManual(null);
    setPreferirCentro(false);
  }

  const alternarCategoria = (c: CategoriaPOI) =>
    setCategorias((atual) => (atual.includes(c) ? atual.filter((x) => x !== c) : [...atual, c]));

  async function aoGerar() {
    if (!podeGerar) return;
    try {
      const roteiro = await gerar.mutateAsync({
        cidadeId: cidade.id,
        origem,
        categorias,
        orcamento: teto.valor,
        tempoDisponivelMin: tempoMin,
        // Recalculado na hora do toque: "agora" é agora, e não quando a tela abriu.
        inicioPrevisto: inicioPrevisto(horaInicio).toISOString(),
      });
      router.replace(`/roteiro/${roteiro.id}`);
    } catch {
      // A mensagem do serviço aparece acima do botão.
    }
  }

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={alturaCabecalho}
      style={{ flex: 1, backgroundColor: cores.fundo }}>
      <ScrollView
        ref={rolagem}
        innerViewRef={conteudo as RefObject<View>}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          padding: espaco.lg,
          gap: espaco.xl,
          paddingBottom: (tecladoAberto ? espaco.xl : 140) + insets.bottom,
        }}>
        <View style={{ gap: espaco.md }}>
          <CartaoLocalizacao localizacao={localizacao} partida={partida} />
          <EscolhaDaPartida
            partida={partida}
            localizacao={localizacao}
            onTocarNoMapa={setPartidaManual}
            onUsarGps={() => {
              setPartidaManual(null);
              setPreferirCentro(false);
            }}
            onUsarCentro={() => {
              setPartidaManual(null);
              setPreferirCentro(true);
            }}
          />
        </View>

        <Secao titulo="Onde você está?">
          <GrupoDeOpcoes rotulo="Cidade">
            {(cidades ?? []).map((c) => (
              <Chip
                key={c.id}
                rotulo={`${c.bandeira} ${c.nome}`}
                ativo={c.id === cidade?.id}
                onPress={() => trocarCidade(c.id)}
              />
            ))}
          </GrupoDeOpcoes>
        </Secao>

        <Secao titulo="O que te interessa?">
          <GrupoDeOpcoes rotulo="Interesses" multipla>
            {CATEGORIAS.map((c) => (
              <Chip
                key={c}
                rotulo={rotuloCategoria[c]}
                icone={iconeCategoria[c]}
                selecao="multipla"
                ativo={categorias.includes(c)}
                onPress={() => alternarCategoria(c)}
              />
            ))}
          </GrupoDeOpcoes>
        </Secao>

        <EscolhaDoTeto texto={textoDoTeto} onMudar={setTextoDoTeto} onFocarCampo={rolarAteCampo} />

        <Secao titulo="Quanto tempo tem livre?">
          <GrupoDeOpcoes rotulo="Tempo disponível">
            {TEMPOS.map((t) => (
              <Chip
                key={t}
                rotulo={formatarDuracao(t)}
                ativo={t === tempoMin}
                onPress={() => setTempoMin(t)}
              />
            ))}
          </GrupoDeOpcoes>
        </Secao>

        <EscolhaDoHorario hora={horaInicio} onEscolher={setHoraInicio} />

        <ResumoDoPedido
          nomeCidade={cidade?.nome}
          teto={teto.valor}
          tempoMin={tempoMin}
          inicio={inicio}
          modo={modo}
        />
      </ScrollView>

      {/* Com o teclado aberto, o botão flutuante sai para não cobrir o campo. */}
      <View
        pointerEvents={tecladoAberto ? 'none' : 'auto'}
        style={{
          position: 'absolute',
          left: espaco.lg,
          right: espaco.lg,
          bottom: espaco.md + Math.max(insets.bottom, espaco.sm),
          gap: espaco.sm,
          opacity: tecladoAberto ? 0 : 1,
        }}>
        {/* Fica junto do botão para aparecer sem precisar rolar a tela. */}
        {gerar.error ? (
          <AvisoDeErro mensagem={gerar.error.message} onFechar={() => gerar.reset()} />
        ) : null}
        <Botao
          titulo={gerar.isPending ? 'Montando roteiro...' : 'Gerar roteiro'}
          icone="sparkles"
          carregando={gerar.isPending}
          desabilitado={!podeGerar}
          onPress={aoGerar}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
