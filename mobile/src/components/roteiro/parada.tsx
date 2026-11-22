/**
 * Uma parada do roteiro: o trecho até ela, o lugar (foto, horário previsto,
 * categoria, aviso de horário de funcionamento) e as ações (trocar, remover,
 * check-in).
 */

import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, View } from 'react-native';

import { FotoDoLugar } from '@/components/foto';
import { Botao, Cartao, Texto } from '@/components/ui';
import { formatarDuracao, formatarHora, formatarReais, rotuloCategoria } from '@/domain/format';
import type { ItemRoteiro } from '@/domain/types';
import { useCores } from '@/theme/provider';
import { espaco, raio } from '@/theme/tokens';
import { RegistroDeChegada, type PropsChegada } from './chegada';
import { disposicao } from './estilos';
import { TrechoAteAqui } from './trecho';

interface PropsParada extends PropsChegada {
  onRemover: () => void;
  onTrocar: () => void;
}

export function ParadaDoRoteiro({ onRemover, onTrocar, ...chegada }: PropsParada) {
  const { item, ocupado } = chegada;
  const cores = useCores();
  const { ponto } = item;

  return (
    <View style={{ gap: espaco.sm }}>
      {item.trechoAteAqui ? <TrechoAteAqui trecho={item.trechoAteAqui} /> : null}

      <Cartao padding={espaco.md}>
        <View style={{ flexDirection: 'row', gap: espaco.md }}>
          <FotoDoLugar
            uri={ponto.fotoUrl}
            style={{
              width: 72,
              height: 72,
              borderRadius: raio.md,
              backgroundColor: cores.fundoAlt,
            }}
          />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={disposicao.linhaTopo}>
              <Texto variante="corpo" peso="semi" numberOfLines={1} style={{ flex: 1 }}>
                {item.ordem}. {ponto.nome}
              </Texto>
              <Texto variante="micro" peso="semi" cor={cores.primaria}>
                {formatarHora(item.chegadaPrevista)}
              </Texto>
            </View>

            <Texto variante="micro" cor={cores.textoSuave}>
              {rotuloCategoria[ponto.categoria]} · {formatarDuracao(ponto.tempoVisitaMin)} de visita
              {item.custoNoLocal > 0 ? ` · ${formatarReais(item.custoNoLocal)}` : ''}
              {ponto.arLivre ? ' · ao ar livre' : ''}
            </Texto>

            <AvisoDeHorario item={item} />

            {/* Ponto vindo só do mapa não tem nota: a linha some, em vez de inventar. */}
            {ponto.nota != null ? (
              <View style={disposicao.linhaIcone}>
                <Ionicons name="star" size={12} color={cores.alerta} aria-hidden />
                <Texto variante="micro" cor={cores.textoSuave}>
                  {ponto.nota.toFixed(1)} ({ponto.avaliacoes})
                </Texto>
              </View>
            ) : null}

            {/* Crédito exigido pela licença da foto; leva à página dela no Commons. */}
            {ponto.fotoCredito ? (
              <Pressable
                hitSlop={6}
                role="link"
                aria-label={`${ponto.fotoCredito}. Abre a página da foto.`}
                disabled={!ponto.fotoFonte}
                onPress={() => ponto.fotoFonte && void Linking.openURL(ponto.fotoFonte)}>
                <Texto variante="micro" cor={cores.textoSuave} numberOfLines={1}>
                  {ponto.fotoCredito}
                </Texto>
              </Pressable>
            ) : null}

            {/* Parada já visitada não se troca nem se remove. */}
            {item.visita ? null : (
              <View style={{ flexDirection: 'row', gap: espaco.sm, marginTop: espaco.xs }}>
                <Botao
                  titulo="Trocar"
                  rotuloAcessivel={`Trocar ${ponto.nome} por outro lugar`}
                  variante="contorno"
                  icone="swap-horizontal"
                  largura="auto"
                  desabilitado={ocupado}
                  onPress={onTrocar}
                  style={{ minHeight: 36, paddingHorizontal: espaco.md }}
                />
                <Botao
                  titulo="Remover"
                  rotuloAcessivel={`Remover ${ponto.nome} do roteiro`}
                  variante="texto"
                  icone="close"
                  largura="auto"
                  desabilitado={ocupado}
                  onPress={onRemover}
                  style={{ minHeight: 36, paddingHorizontal: espaco.sm }}
                />
              </View>
            )}
          </View>
        </View>

        <RegistroDeChegada {...chegada} />
      </Cartao>
    </View>
  );
}

/** Fechado não sai do roteiro: aparece marcado, e a pessoa decide se vai. */
function AvisoDeHorario({ item }: { item: ItemRoteiro }) {
  const cores = useCores();
  const situacao = item.situacaoNoHorario ?? 'aberto';
  if (situacao === 'aberto') return null;

  const fechado = situacao === 'fechado';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingHorizontal: espaco.sm,
        paddingVertical: 4,
        borderRadius: raio.md,
        backgroundColor: cores.alertaSuave,
      }}>
      <Ionicons
        name={fechado ? 'moon-outline' : 'hourglass-outline'}
        size={13}
        color={cores.alerta}
        aria-hidden
      />
      <Texto variante="micro" peso="semi" cor={cores.alerta}>
        {fechado ? 'Fechado nesse horário' : 'Fecha antes do fim da visita'}
        {item.ponto.horarioHoje ? ` · funciona das ${item.ponto.horarioHoje}` : ''}
      </Texto>
    </View>
  );
}
