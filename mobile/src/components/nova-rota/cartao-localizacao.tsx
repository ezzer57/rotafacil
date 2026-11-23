/**
 * Cartão que diz de onde o roteiro vai partir e por quê (ver
 * descrever-localizacao.ts), com a ação que resolve, quando há uma.
 */

import { Ionicons } from '@expo/vector-icons';
import { Linking, Platform, View } from 'react-native';

import { Botao, Cartao, Texto } from '@/components/ui';
import type { Partida } from '@/domain/partida';
import type { Localizacao } from '@/hooks/use-localizacao';
import { useCores } from '@/theme/provider';
import { espaco } from '@/theme/tokens';
import { descreverLocalizacao, type AcaoDeLocalizacao } from './descrever-localizacao';

const ROTULO_DA_ACAO: Record<AcaoDeLocalizacao, string> = {
  'tentar-de-novo': 'Tentar novamente',
  atualizar: 'Atualizar posição',
  'abrir-ajustes': 'Abrir ajustes',
};

export function CartaoLocalizacao({
  localizacao,
  partida,
}: {
  localizacao: Localizacao;
  partida: Partida;
}) {
  const cores = useCores();
  const descricao = descreverLocalizacao(
    localizacao,
    partida,
    partida.cidade?.nome ?? 'cidade',
    Platform.OS === 'web',
  );

  const visual = {
    sucesso: { cor: cores.sucesso, fundo: cores.sucessoSuave },
    alerta: { cor: cores.alerta, fundo: cores.alertaSuave },
    neutro: { cor: cores.textoSuave, fundo: cores.fundoAlt },
  }[descricao.tom];

  function agir(acao: AcaoDeLocalizacao) {
    if (acao === 'abrir-ajustes') void Linking.openSettings();
    else void localizacao.solicitar();
  }

  return (
    <Cartao style={{ backgroundColor: visual.fundo, borderColor: visual.fundo }}>
      <View style={{ flexDirection: 'row', gap: espaco.md }}>
        <Ionicons name={descricao.icone} size={20} color={visual.cor} aria-hidden />
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="pequeno" peso="semi" cor={visual.cor}>
            {descricao.titulo}
          </Texto>
          <Texto variante="micro" cor={cores.textoSuave}>
            {descricao.detalhe}
          </Texto>
          {descricao.acao ? (
            <Botao
              titulo={ROTULO_DA_ACAO[descricao.acao]}
              variante="texto"
              largura="auto"
              onPress={() => agir(descricao.acao!)}
              style={{ minHeight: 32, paddingHorizontal: 0, marginTop: espaco.xs }}
            />
          ) : null}
        </View>
      </View>
    </Cartao>
  );
}
