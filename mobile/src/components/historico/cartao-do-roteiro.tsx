/**
 * Um roteiro da lista (Início e Histórico): capa, cidade, paradas, data e
 * custo. Tocar abre o roteiro. No Histórico, o cartão também apaga, com uma
 * confirmação antes, porque apagar não tem volta.
 */

import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { FotoDoLugar } from '@/components/foto';
import { Botao, Cartao, Texto } from '@/components/ui';
import { formatarDataCurta, formatarReais } from '@/domain/format';
import type { ResumoRoteiro } from '@/domain/types';
import { useCores } from '@/theme/provider';
import { espaco, raio } from '@/theme/tokens';

interface Props {
  resumo: ResumoRoteiro;
  onAbrir: () => void;
  /** Com ele, o cartão mostra o "Apagar". */
  onApagar?: () => void;
  apagando?: boolean;
  /** Mostra visitas e valor pago (Histórico); sem ele, a versão curta (Início). */
  detalhado?: boolean;
}

export function CartaoDoRoteiro({ resumo, onAbrir, onApagar, apagando, detalhado }: Props) {
  const cores = useCores();
  const [confirmando, setConfirmando] = useState(false);
  const data = formatarDataCurta(resumo.criadoEm);
  const descricao = `roteiro de ${resumo.cidadeNome}, ${data}`;

  const visitas =
    resumo.pontosVisitados > 0
      ? `${resumo.pontosVisitados === 1 ? '1 parada visitada' : `${resumo.pontosVisitados} paradas visitadas`}${
          resumo.custoRegistrado != null
            ? ` · ${formatarReais(resumo.custoRegistrado)} pagos em corridas`
            : ''
        }`
      : null;

  return (
    <Cartao padding={espaco.md}>
      <Pressable
        onPress={onAbrir}
        role="button"
        aria-label={`Abrir o ${descricao}, ${resumo.totalPontos} paradas, ${formatarReais(resumo.custoEstimado)} previstos`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: espaco.md,
          opacity: pressed ? 0.85 : 1,
        })}>
        <FotoDoLugar
          uri={resumo.capaUrl}
          style={{
            width: detalhado ? 64 : 48,
            height: detalhado ? 64 : 48,
            borderRadius: raio.md,
            backgroundColor: cores.fundoAlt,
          }}
          tamanhoIcone={18}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="corpo" peso="semi">
            {resumo.cidadeNome}
          </Texto>
          <Texto variante="pequeno" cor={cores.textoSuave}>
            {resumo.totalPontos} paradas · {data}
          </Texto>
          {detalhado && visitas ? (
            <Texto variante="micro" peso="semi" cor={cores.sucesso}>
              {visitas}
            </Texto>
          ) : null}
          {detalhado ? (
            <Texto variante="pequeno" peso="semi" cor={cores.primaria}>
              {formatarReais(resumo.custoEstimado)} previstos
            </Texto>
          ) : null}
        </View>
        {!detalhado ? (
          <Texto variante="pequeno" peso="semi" cor={cores.primaria}>
            {formatarReais(resumo.custoEstimado)}
          </Texto>
        ) : null}
      </Pressable>

      {onApagar ? (
        confirmando ? (
          <View style={{ gap: espaco.sm, marginTop: espaco.md }}>
            <Texto variante="micro" cor={cores.textoSuave}>
              Apagar este roteiro, com as paradas e as visitas? Não dá para desfazer.
            </Texto>
            <View style={{ flexDirection: 'row', gap: espaco.sm }}>
              <Botao
                titulo="Apagar"
                rotuloAcessivel={`Confirmar: apagar o ${descricao}`}
                icone="trash-outline"
                largura="auto"
                carregando={apagando}
                onPress={onApagar}
                style={{ minHeight: 40, paddingHorizontal: espaco.lg }}
              />
              <Botao
                titulo="Cancelar"
                variante="texto"
                largura="auto"
                desabilitado={apagando}
                onPress={() => setConfirmando(false)}
                style={{ minHeight: 40 }}
              />
            </View>
          </View>
        ) : (
          <Botao
            titulo="Apagar"
            rotuloAcessivel={`Apagar o ${descricao}`}
            variante="texto"
            icone="trash-outline"
            largura="auto"
            onPress={() => setConfirmando(true)}
            style={{ minHeight: 32, paddingHorizontal: 0, marginTop: espaco.sm }}
          />
        )
      ) : null}
    </Cartao>
  );
}
