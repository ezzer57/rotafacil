/**
 * "Recalcular daqui" (objetivo 7 do TCC): quem atrasou, mudou de lugar ou
 * ganhou tempo refaz o resto do roteiro a partir de onde está, agora. As
 * paradas em que já chegou ficam como estão.
 *
 * O cartão pergunta quanto tempo a pessoa ainda tem (já marcando o que sobra
 * do plano), lê a posição uma vez e pede o recálculo. Sem a posição, a API
 * parte da última parada feita, e o cartão diz isso depois.
 */

import { useState } from 'react';
import { View } from 'react-native';

import { AvisoDeErro, Botao, Cartao, Chip, GrupoDeOpcoes, Texto } from '@/components/ui';
import { descreverRecalculo, opcoesDeTempo } from '@/domain/recalculo';
import type { Coordenada, PedidoDeRecalculo, Roteiro } from '@/domain/types';
import { lerPosicaoAgora } from '@/hooks/use-localizacao';
import { useCores } from '@/theme/provider';
import { espaco } from '@/theme/tokens';

interface Props {
  roteiro: Roteiro;
  /** O recálculo pedido por este cartão está em andamento. */
  recalculando: boolean;
  /** Outro ajuste (teto, troca, remoção) está em andamento. */
  bloqueado: boolean;
  /** Pede o recálculo; a promessa falha se ele falhar. */
  onRecalcular: (pedido: PedidoDeRecalculo) => Promise<unknown>;
  /** Como ler a posição (o teste passa uma simulada). */
  lerPosicao?: () => Promise<Coordenada | null>;
  /** O relógio de referência (o teste passa um fixo). */
  agora?: Date;
}

export function RecalcularDaqui({
  roteiro,
  recalculando,
  bloqueado,
  onRecalcular,
  lerPosicao = lerPosicaoAgora,
  agora,
}: Props) {
  const cores = useCores();
  const [aberto, setAberto] = useState(false);
  const [escolhido, setEscolhido] = useState<number | null>(null);
  const [procurando, setProcurando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const { opcoes, padrao } = opcoesDeTempo(roteiro, agora);
  // O "que sobra" encolhe com o relógio: se a opção escolhida sumiu, vale a
  // marcada (a sobra de agora), e não um tempo que a tela já não mostra.
  const tempo = opcoes.some((opcao) => opcao.minutos === escolhido) ? escolhido! : padrao;
  const ocupado = procurando || recalculando;
  const nadaMaisCoube = roteiro.recalculo != null && roteiro.itens.every((item) => item.visita);

  function abrir() {
    setEscolhido(null);
    setErro(null);
    setAberto(true);
  }

  async function recalcular() {
    setErro(null);
    setProcurando(true);
    const origem = await lerPosicao();
    setProcurando(false);
    try {
      await onRecalcular({ origem, tempoDisponivelMin: tempo });
      setAberto(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível recalcular o roteiro');
    }
  }

  return (
    <Cartao>
      <Texto variante="pequeno" peso="semi">
        Mudou de lugar ou de horário?
      </Texto>

      {roteiro.recalculo ? (
        <Texto variante="micro" cor={cores.textoSuave} style={{ marginTop: espaco.xs }}>
          {descreverRecalculo(roteiro.recalculo)}
        </Texto>
      ) : (
        <Texto variante="micro" cor={cores.textoSuave} style={{ marginTop: espaco.xs }}>
          Refaça o resto do roteiro a partir de onde você está agora. As paradas em que você já
          chegou ficam como estão.
        </Texto>
      )}

      {nadaMaisCoube ? (
        <Texto variante="micro" peso="semi" cor={cores.alerta} style={{ marginTop: espaco.xs }}>
          Nada mais coube nesse tempo. Recalcule com mais tempo livre.
        </Texto>
      ) : null}

      {aberto ? (
        <View style={{ gap: espaco.sm, marginTop: espaco.md }}>
          <Texto variante="pequeno" peso="semi">
            Quanto tempo ainda tem livre?
          </Texto>
          <GrupoDeOpcoes rotulo="Tempo livre a partir de agora">
            {opcoes.map((opcao) => (
              <Chip
                key={opcao.minutos}
                rotulo={opcao.rotulo}
                ativo={opcao.minutos === tempo}
                onPress={() => setEscolhido(opcao.minutos)}
              />
            ))}
          </GrupoDeOpcoes>
          <Texto variante="micro" cor={cores.textoSuave}>
            O app lê a sua localização uma vez, só agora, para saber de onde partir.
          </Texto>

          {erro ? <AvisoDeErro mensagem={erro} onFechar={() => setErro(null)} /> : null}

          <View style={{ flexDirection: 'row', gap: espaco.sm }}>
            <Botao
              titulo={
                procurando ? 'Procurando você...' : recalculando ? 'Refazendo...' : 'Recalcular'
              }
              rotuloAcessivel="Recalcular o resto do roteiro a partir daqui"
              icone="navigate"
              largura="auto"
              carregando={ocupado}
              desabilitado={bloqueado}
              onPress={recalcular}
              style={{ minHeight: 40, paddingHorizontal: espaco.lg }}
            />
            <Botao
              titulo="Cancelar"
              variante="texto"
              largura="auto"
              desabilitado={ocupado}
              onPress={() => setAberto(false)}
              style={{ minHeight: 40 }}
            />
          </View>
        </View>
      ) : (
        <Botao
          titulo="Recalcular daqui"
          variante="secundario"
          icone="locate"
          desabilitado={bloqueado}
          onPress={abrir}
          style={{ minHeight: 40, marginTop: espaco.md }}
        />
      )}
    </Cartao>
  );
}
