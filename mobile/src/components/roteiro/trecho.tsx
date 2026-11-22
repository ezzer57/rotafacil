/**
 * Deslocamento até uma parada: a pé (grátis) ou de carro, com a faixa de
 * preço, a bandeira e, ao tocar, a memória de cálculo da tarifa ("como
 * calculamos"), que dá transparência ao número.
 */

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Cartao, Selo, Texto } from '@/components/ui';
import { formatarDistancia, formatarDuracao, formatarFaixa, formatarReais } from '@/domain/format';
import type { DetalheCalculoTarifa, Trecho } from '@/domain/types';
import { useCores } from '@/theme/provider';
import { espaco } from '@/theme/tokens';

const linhaDoTrecho = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: espaco.xs,
  paddingHorizontal: espaco.sm,
} as const;

export function TrechoAteAqui({ trecho }: { trecho: Trecho }) {
  const cores = useCores();
  const [aberto, setAberto] = useState(false);
  const distancia = `${formatarDistancia(trecho.distanciaKm)} · ${formatarDuracao(trecho.duracaoMin)}`;

  if (trecho.modal === 'pe') {
    return (
      <View style={linhaDoTrecho}>
        <Ionicons name="walk" size={15} color={cores.sucesso} aria-hidden />
        <Texto variante="micro" cor={cores.textoSuave}>
          {distancia}
        </Texto>
        <View style={{ flex: 1 }} />
        <Selo texto="A pé · grátis" cor={cores.sucesso} fundo={cores.sucessoSuave} />
      </View>
    );
  }

  const faixa = formatarFaixa(trecho.custo);
  const calculo = trecho.calculo;
  const resumo = (
    <>
      <Ionicons name="car" size={15} color={cores.textoSuave} aria-hidden />
      <Texto variante="micro" cor={cores.textoSuave}>
        {distancia}
      </Texto>
      <View style={{ flex: 1 }} />
      <Selo
        texto={`${faixa} · bandeira ${trecho.bandeira}`}
        cor={cores.primaria}
        fundo={cores.primariaSuave}
      />
    </>
  );

  // Sem memória de cálculo não há o que abrir.
  if (!calculo) return <View style={linhaDoTrecho}>{resumo}</View>;

  return (
    <View style={{ gap: espaco.xs }}>
      <Pressable
        onPress={() => setAberto((valor) => !valor)}
        role="button"
        aria-expanded={aberto}
        aria-label={`Corrida de ${distancia}, ${faixa}, bandeira ${trecho.bandeira}. Toque para ver como calculamos.`}
        style={linhaDoTrecho}>
        {resumo}
        <Ionicons
          name={aberto ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={cores.textoSuave}
          aria-hidden
        />
      </Pressable>

      {aberto ? <ComoCalculamos calculo={calculo} trecho={trecho} /> : null}
    </View>
  );
}

/** Memória de cálculo: tarifa do táxi (equação 8) e fator de aplicativo (equação 10). */
function ComoCalculamos({ calculo: c, trecho }: { calculo: DetalheCalculoTarifa; trecho: Trecho }) {
  const cores = useCores();

  return (
    <Cartao padding={espaco.md} style={{ backgroundColor: cores.fundoAlt }}>
      <Texto variante="micro" peso="semi" cor={cores.textoSuave}>
        Como calculamos
      </Texto>

      <View style={{ gap: 2, marginTop: espaco.sm }}>
        <LinhaCalculo rotulo="Bandeirada" valor={formatarReais(c.bandeirada)} />
        <LinhaCalculo
          rotulo={`${formatarDistancia(c.distanciaKm)} × ${formatarReais(c.valorPorKm)}/km (bandeira ${trecho.bandeira})`}
          valor={formatarReais(c.distanciaKm * c.valorPorKm)}
        />
        <LinhaCalculo
          rotulo={`${c.minutosLentos.toFixed(1).replace('.', ',')} min parado × ${formatarReais(c.valorHoraParada)}/h`}
          valor={formatarReais((c.valorHoraParada / 60) * c.minutosLentos)}
        />
        <View style={{ height: 1, backgroundColor: cores.borda, marginVertical: espaco.xs }} />
        <LinhaCalculo
          rotulo="Tarifa de táxi (equação 8)"
          valor={formatarReais(c.subtotalTaxi)}
          destaque
        />
        <LinhaCalculo
          rotulo={`Fator de aplicativo (α = ${String(c.fatorAplicativo).replace('.', ',')})`}
          valor={formatarReais(trecho.custo.estimado)}
          destaque
        />
      </View>

      <Texto variante="micro" cor={cores.textoSuave} style={{ marginTop: espaco.sm }}>
        Fonte da tarifa: {c.norma}
      </Texto>
    </Cartao>
  );
}

function LinhaCalculo({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  const cores = useCores();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: espaco.md }}>
      <Texto
        variante="micro"
        cor={destaque ? cores.texto : cores.textoSuave}
        peso={destaque ? 'semi' : 'normal'}
        style={{ flex: 1 }}>
        {rotulo}
      </Texto>
      <Texto variante="micro" peso={destaque ? 'semi' : 'normal'}>
        {valor}
      </Texto>
    </View>
  );
}
