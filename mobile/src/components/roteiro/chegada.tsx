/**
 * Check-in de uma parada ("Cheguei").
 *
 * Registra a hora de chegada e, quando o trecho até ali foi de carro, o valor
 * pago na corrida: é o dado do histórico (hipótese 3) e o preço real que mede
 * a estimativa (hipótese 1). Depois do check-in, mostra a chegada e permite
 * desfazer um toque por engano.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { Botao, Campo, Texto } from '@/components/ui';
import { formatarHora, formatarReais } from '@/domain/format';
import { CORRIDA_MAXIMA, limitarValorEmReais } from '@/domain/limites';
import type { ItemRoteiro } from '@/domain/types';
import { useCores } from '@/theme/provider';
import { espaco } from '@/theme/tokens';
import { disposicao } from './estilos';

export interface PropsChegada {
  item: ItemRoteiro;
  /** Um recálculo do roteiro está em andamento. */
  ocupado: boolean;
  /** Um check-in (ou o desfazer) está em andamento. */
  registrando: boolean;
  onCheckin: (custoRegistrado?: number) => void;
  onDesfazer: () => void;
  /** Chamado quando o campo do valor ganha foco, para a tela rolar até ele. */
  onFocarCampo?: (campo: View | null) => void;
}

export function RegistroDeChegada({
  item,
  ocupado,
  registrando,
  onCheckin,
  onDesfazer,
  onFocarCampo,
}: PropsChegada) {
  const cores = useCores();
  const [informandoValor, setInformandoValor] = useState(false);
  const [valorPago, setValorPago] = useState('');
  const campoValor = useRef<View>(null);
  const nome = item.ponto.nome;

  if (item.visita) {
    return (
      <View style={[disposicao.linhaIcone, { marginTop: espaco.md }]}>
        <Ionicons name="checkmark-circle" size={16} color={cores.sucesso} aria-hidden />
        <Texto variante="micro" peso="semi" cor={cores.sucesso} style={{ flex: 1 }}>
          Chegou às {formatarHora(item.visita.chegadaEm)}
          {item.visita.custoRegistrado != null
            ? ` · pagou ${formatarReais(item.visita.custoRegistrado)} na corrida`
            : ''}
        </Texto>
        <Botao
          titulo="Desfazer"
          rotuloAcessivel={`Desfazer a chegada em ${nome}`}
          variante="texto"
          largura="auto"
          desabilitado={registrando}
          onPress={onDesfazer}
          style={{ minHeight: 28, paddingHorizontal: 0 }}
        />
      </View>
    );
  }

  // Só faz sentido perguntar o preço quando o trecho até aqui foi de carro.
  const veioDeCarro = item.trechoAteAqui?.modal === 'app';

  if (!informandoValor) {
    return (
      <Botao
        titulo="Cheguei"
        rotuloAcessivel={`Cheguei em ${nome}`}
        variante="secundario"
        icone="checkmark-circle-outline"
        carregando={registrando}
        desabilitado={ocupado}
        onPress={() => (veioDeCarro ? setInformandoValor(true) : onCheckin())}
        style={{ minHeight: 40, marginTop: espaco.md }}
      />
    );
  }

  function registrarChegada() {
    const valor = Number(valorPago.replace(',', '.'));
    onCheckin(valor > 0 ? valor : undefined);
    setInformandoValor(false);
    setValorPago('');
  }

  return (
    <View style={{ gap: espaco.sm, marginTop: espaco.md }}>
      <Campo
        refContainer={campoValor}
        onFocus={() => onFocarCampo?.(campoValor.current)}
        icone="cash-outline"
        rotulo={`Quanto pagou na corrida até aqui? (opcional, até ${formatarReais(CORRIDA_MAXIMA)})`}
        keyboardType="decimal-pad"
        value={valorPago}
        onChangeText={(texto) => setValorPago(limitarValorEmReais(texto, CORRIDA_MAXIMA))}
        maxLength={6}
        placeholder="Valor cobrado pelo aplicativo"
      />
      <Texto variante="micro" cor={cores.textoSuave}>
        Use o valor final que o aplicativo de transporte cobrou. Ele mostra o quanto a estimativa
        acertou.
      </Texto>
      <View style={{ flexDirection: 'row', gap: espaco.sm }}>
        <Botao
          titulo="Registrar chegada"
          rotuloAcessivel={`Registrar a chegada em ${nome}`}
          variante="secundario"
          icone="checkmark"
          largura="auto"
          carregando={registrando}
          onPress={registrarChegada}
          style={{ minHeight: 40, paddingHorizontal: espaco.md }}
        />
        <Botao
          titulo="Cancelar"
          variante="texto"
          largura="auto"
          onPress={() => setInformandoValor(false)}
          style={{ minHeight: 40, paddingHorizontal: espaco.sm }}
        />
      </View>
    </View>
  );
}
