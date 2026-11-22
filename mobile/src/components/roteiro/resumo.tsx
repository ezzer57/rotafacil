/**
 * Resumo do roteiro: custo, duração, uso do teto de gasto e os avisos
 * (trechos a pé, paradas visitadas, lugares fora do horário).
 */

import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Cartao, Selo, Texto } from '@/components/ui';
import { formatarDuracao, formatarFaixa, formatarReais } from '@/domain/format';
import type { Roteiro } from '@/domain/types';
import { useCores } from '@/theme/provider';
import { espaco, raio } from '@/theme/tokens';
import { disposicao } from './estilos';

export function ResumoDoRoteiro({ roteiro }: { roteiro: Roteiro }) {
  const cores = useCores();
  const { totais } = roteiro;
  const uso = totais.usoOrcamento;
  const visitadas = roteiro.itens.filter((item) => item.visita).length;
  const foraDoHorario = roteiro.itens.filter(
    (item) => (item.situacaoNoHorario ?? 'aberto') !== 'aberto',
  ).length;

  return (
    <Cartao>
      <View style={disposicao.linhaTopo}>
        <Texto variante="titulo" peso="forte" accessibilityRole="header">
          {roteiro.cidadeNome}
        </Texto>
        <Selo
          texto={`${roteiro.itens.length} paradas`}
          icone="location"
          cor={cores.primaria}
          fundo={cores.primariaSuave}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: espaco.md, marginTop: espaco.md }}>
        <Metrica
          icone="cash-outline"
          rotulo="Custo estimado"
          valor={formatarReais(totais.custoTotal.estimado)}
          detalhe={formatarFaixa(totais.custoTotal)}
        />
        <Metrica
          icone="time-outline"
          rotulo="Duração"
          valor={formatarDuracao(totais.duracaoMin)}
          detalhe={`de ${formatarDuracao(roteiro.tempoDisponivelMin)} disponíveis`}
        />
      </View>

      {uso != null ? (
        <View style={{ gap: espaco.xs, marginTop: espaco.md }}>
          <View style={disposicao.linhaTopo}>
            <Texto variante="micro" cor={cores.textoSuave}>
              Uso do orçamento
            </Texto>
            <Texto variante="micro" peso="semi">
              {uso}%
            </Texto>
          </View>
          <View
            accessible
            role="progressbar"
            aria-label="Uso do orçamento"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={uso}
            style={{
              height: 8,
              borderRadius: raio.pilula,
              backgroundColor: cores.fundoAlt,
              overflow: 'hidden',
            }}>
            <View
              style={{
                height: 8,
                borderRadius: raio.pilula,
                width: `${uso}%`,
                backgroundColor: uso > 85 ? cores.alerta : cores.sucesso,
              }}
            />
          </View>
        </View>
      ) : (
        <Texto variante="micro" cor={cores.textoSuave} style={{ marginTop: espaco.md }}>
          Sem teto de gasto: o valor acima é a média prevista, e a faixa vai do mínimo ao máximo.
        </Texto>
      )}

      {totais.trechosAPe > 0 ? (
        <Aviso icone="walk" cor={cores.sucesso} espacoAcima={espaco.md}>
          {totais.trechosAPe} {totais.trechosAPe === 1 ? 'trecho a pé' : 'trechos a pé'}:{' '}
          {formatarReais(totais.economiaCaminhando)} economizados
        </Aviso>
      ) : null}

      {visitadas > 0 ? (
        <Aviso icone="checkmark-done" cor={cores.sucesso}>
          {visitadas} de {roteiro.itens.length} paradas visitadas
          {totais.custoRegistrado != null
            ? ` · ${formatarReais(totais.custoRegistrado)} pagos em corridas`
            : ''}
        </Aviso>
      ) : null}

      {foraDoHorario > 0 ? (
        <Aviso icone="moon-outline" cor={cores.alerta}>
          {foraDoHorario === 1
            ? '1 parada cai fora do horário de funcionamento'
            : `${foraDoHorario} paradas caem fora do horário de funcionamento`}
          : veja os avisos no percurso.
        </Aviso>
      ) : null}
    </Cartao>
  );
}

function Metrica({
  icone,
  rotulo,
  valor,
  detalhe,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  rotulo: string;
  valor: string;
  detalhe: string;
}) {
  const cores = useCores();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name={icone} size={14} color={cores.textoSuave} aria-hidden />
        <Texto variante="micro" cor={cores.textoSuave}>
          {rotulo}
        </Texto>
      </View>
      <Texto variante="destaque" peso="forte">
        {valor}
      </Texto>
      <Texto variante="micro" cor={cores.textoSuave}>
        {detalhe}
      </Texto>
    </View>
  );
}

function Aviso({
  icone,
  cor,
  espacoAcima = espaco.xs,
  children,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  cor: string;
  espacoAcima?: number;
  children: React.ReactNode;
}) {
  return (
    <View style={[disposicao.linhaIcone, { marginTop: espacoAcima }]}>
      <Ionicons name={icone} size={14} color={cor} aria-hidden />
      <Texto variante="micro" cor={cor} style={{ flex: 1 }}>
        {children}
      </Texto>
    </View>
  );
}
