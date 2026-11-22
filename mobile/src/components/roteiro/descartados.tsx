/**
 * O que o algoritmo avaliou e deixou de fora, com o motivo, e as métricas do
 * processamento. As duas partes existem para a decisão do motor ficar
 * auditável na apresentação.
 */

import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Cartao, Texto } from '@/components/ui';
import { rotuloMotivoDescarte } from '@/domain/format';
import type { DiagnosticoRoteiro, MotivoDescarte, PontoDescartado } from '@/domain/types';
import { useCores } from '@/theme/provider';
import { espaco, raio, type Paleta } from '@/theme/tokens';
import { disposicao } from './estilos';

export function PontosDescartados({ descartados }: { descartados: PontoDescartado[] }) {
  if (descartados.length === 0) return null;

  return (
    <View style={{ gap: espaco.sm }}>
      <Texto variante="destaque" peso="forte" accessibilityRole="header">
        Avaliados e deixados de fora
      </Texto>
      {descartados.map((descartado) => (
        <LinhaDescartada key={descartado.ponto.id} descartado={descartado} />
      ))}
    </View>
  );
}

const visualDoMotivo = (
  cores: Paleta,
): Record<
  MotivoDescarte,
  { cor: string; fundo: string; icone: keyof typeof Ionicons.glyphMap }
> => ({
  orcamento: { cor: cores.erro, fundo: cores.erroSuave, icone: 'wallet-outline' },
  tempo: { cor: cores.alerta, fundo: cores.alertaSuave, icone: 'time-outline' },
  horario: { cor: cores.alerta, fundo: cores.alertaSuave, icone: 'lock-closed-outline' },
});

function LinhaDescartada({ descartado }: { descartado: PontoDescartado }) {
  const cores = useCores();
  const visual = visualDoMotivo(cores)[descartado.motivo];

  return (
    <Cartao padding={espaco.md} style={{ backgroundColor: cores.fundoAlt }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.md }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: raio.pilula,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: visual.fundo,
          }}>
          <Ionicons name={visual.icone} size={16} color={visual.cor} aria-hidden />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="pequeno" peso="semi" numberOfLines={1}>
            {descartado.ponto.nome}
          </Texto>
          <Texto variante="micro" cor={cores.textoSuave}>
            {rotuloMotivoDescarte[descartado.motivo]}: {descartado.detalhe}
          </Texto>
        </View>
      </View>
    </Cartao>
  );
}

export function PainelDeProcessamento({ diagnostico }: { diagnostico: DiagnosticoRoteiro }) {
  const cores = useCores();
  return (
    <Cartao style={{ backgroundColor: cores.fundoAlt }}>
      <View style={disposicao.linhaIcone}>
        <Ionicons name="hardware-chip-outline" size={14} color={cores.textoSuave} aria-hidden />
        <Texto variante="micro" peso="semi" cor={cores.textoSuave}>
          Processamento
        </Texto>
      </View>
      <Texto variante="micro" cor={cores.textoSuave} style={{ marginTop: 4 }}>
        {diagnostico.candidatosAvaliados} pontos avaliados · {diagnostico.trechosCalculados} trechos
        calculados · roteiro montado em {diagnostico.duracaoMs} ms
      </Texto>
    </Cartao>
  );
}
