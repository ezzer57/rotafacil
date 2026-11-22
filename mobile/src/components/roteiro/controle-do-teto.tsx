/**
 * "E se eu tivesse outro orçamento?": põe, muda ou tira o teto de gasto e
 * pede o recálculo, para ver o algoritmo refazer a seleção ao vivo.
 *
 * Enquanto o controle é arrastado, o valor mostrado é o do dedo, não o do
 * roteiro. Esse estado mora aqui, e não na tela: assim, arrastar só redesenha
 * este cartão.
 */

import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { View } from 'react-native';

import { Botao, Cartao, Texto } from '@/components/ui';
import { formatarReais } from '@/domain/format';
import { TETO_MAXIMO, TETO_MINIMO } from '@/domain/limites';
import type { ID, Reais } from '@/domain/types';
import { useCores } from '@/theme/provider';
import { espaco } from '@/theme/tokens';
import { disposicao } from './estilos';

interface Props {
  roteiroId: ID;
  /** Teto atual do roteiro; null sem limite. */
  orcamento: Reais | null;
  /** O teto está sendo recalculado agora. */
  recalculando: boolean;
  /** Algum recálculo (teto, troca, remoção) está em andamento. */
  bloqueado: boolean;
  /** Pede o recálculo; a promessa falha se o recálculo falhar. */
  onMudarTeto: (valor: Reais | null) => Promise<unknown>;
}

export function ControleDoTeto({
  roteiroId,
  orcamento,
  recalculando,
  bloqueado,
  onMudarTeto,
}: Props) {
  const cores = useCores();

  // Vale só para o roteiro e o teto em que foi arrastado: quando o roteiro
  // volta recalculado, o cartão passa a mostrar o teto dele.
  const chave = `${roteiroId}:${orcamento}`;
  const [arrastado, setArrastado] = useState<{ chave: string; valor: Reais | null } | null>(null);
  const exibido = arrastado?.chave === chave ? arrastado.valor : orcamento;
  const semTeto = orcamento == null;

  function mudar(valor: Reais | null) {
    setArrastado({ chave, valor });
    // Se o recálculo falhar, o cartão volta a mostrar o teto que vale.
    onMudarTeto(valor).catch(() => setArrastado(null));
  }

  return (
    <Cartao>
      <View style={disposicao.linhaTopo}>
        <Texto variante="pequeno" peso="semi">
          {semTeto ? 'Quer definir um teto?' : 'E se eu tivesse outro orçamento?'}
        </Texto>
        <Texto variante="destaque" peso="forte" cor={cores.primaria}>
          {exibido == null ? 'Sem limite' : formatarReais(exibido)}
        </Texto>
      </View>

      <Slider
        accessibilityLabel="Teto de gasto do roteiro"
        style={{ height: 40, marginTop: espaco.sm }}
        minimumValue={TETO_MINIMO}
        maximumValue={TETO_MAXIMO}
        step={5}
        // Sem teto, o controle começa no fim da escala.
        value={exibido ?? TETO_MAXIMO}
        disabled={bloqueado}
        minimumTrackTintColor={cores.primaria}
        maximumTrackTintColor={cores.borda}
        thumbTintColor={cores.primaria}
        onValueChange={(valor) => setArrastado({ chave, valor })}
        onSlidingComplete={mudar}
      />

      <View style={disposicao.linhaTopo}>
        <Texto variante="micro" cor={cores.textoSuave} style={{ flex: 1 }}>
          {recalculando
            ? 'Refazendo a seleção de pontos...'
            : semTeto
              ? 'Arraste para limitar o gasto e ver o algoritmo refazer o roteiro.'
              : 'Arraste para ver o algoritmo refazer o roteiro.'}
        </Texto>
        {!semTeto ? (
          <Botao
            titulo="Tirar o limite"
            rotuloAcessivel="Tirar o teto de gasto"
            variante="texto"
            largura="auto"
            desabilitado={bloqueado}
            onPress={() => mudar(null)}
            style={{ minHeight: 32, paddingHorizontal: 0 }}
          />
        ) : null}
      </View>
    </Cartao>
  );
}
