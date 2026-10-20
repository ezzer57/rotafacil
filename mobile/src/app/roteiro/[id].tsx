/**
 * Roteiro gerado (UI-06).
 *
 * Mostra a linha do tempo das paradas com o custo de cada deslocamento, a
 * bandeira tarifária aplicada e o consumo do orçamento. É a tela que
 * materializa as hipóteses 1 e 2 do trabalho.
 *
 * Três recursos existem especificamente para a defesa:
 *  - o controle de orçamento, que refaz a seleção ao vivo;
 *  - o "como calculamos", que abre a memória de cálculo da tarifa;
 *  - o painel de processamento, com as métricas do algoritmo.
 */

import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import MapaRoteiro, { type ParadaMapa } from '@/components/mapa';
import { Botao, Cartao, Esqueleto, EstadoVazio, Selo, Texto } from '@/components/ui';
import {
  formatarDistancia,
  formatarDuracao,
  formatarFaixa,
  formatarHora,
  formatarReais,
  rotuloCategoria,
  rotuloMotivoDescarte,
} from '@/domain/format';
import type { ItemRoteiro, MotivoDescarte, PontoDescartado, Trecho } from '@/domain/types';
import { useAjustarRoteiro, useRoteiro } from '@/hooks/use-rotafacil';
import { useCores } from '@/theme/provider';
import { espaco, raio, type Paleta } from '@/theme/tokens';

export default function TelaRoteiro() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: roteiro, isLoading } = useRoteiro(id);
  const { remover, substituir, ajustarOrcamento } = useAjustarRoteiro(id);
  const cores = useCores();
  const estilos = useEstilos(cores);

  // Valor mostrado enquanto o controle é arrastado, antes do recálculo.
  const [orcamentoVisual, setOrcamentoVisual] = useState<number | null>(null);

  useEffect(() => {
    if (roteiro) setOrcamentoVisual(roteiro.orcamento);
  }, [roteiro?.id, roteiro?.orcamento]);

  if (isLoading) {
    return (
      <View style={{ padding: espaco.lg, gap: espaco.md }}>
        <Esqueleto altura={120} arredondado={raio.lg} />
        <Esqueleto altura={90} arredondado={raio.lg} />
        <Esqueleto altura={90} arredondado={raio.lg} />
      </View>
    );
  }

  if (!roteiro) {
    return <EstadoVazio titulo="Roteiro não encontrado" icone="alert-circle-outline" />;
  }

  const ajustando = remover.isPending || substituir.isPending || ajustarOrcamento.isPending;
  const orcamentoExibido = orcamentoVisual ?? roteiro.orcamento;

  return (
    <ScrollView
      style={{ backgroundColor: cores.fundo }}
      contentContainerStyle={{ padding: espaco.lg, gap: espaco.lg, paddingBottom: 60 }}>
      {/* --------------------------------------------------------- resumo */}
      <Cartao>
        <View style={estilos.linhaTopo}>
          <Texto variante="titulo" peso="forte">
            {roteiro.cidadeNome}
          </Texto>
          <Selo
            texto={`${roteiro.itens.length} paradas`}
            icone="location"
            cor={cores.primaria}
            fundo={cores.primariaSuave}
          />
        </View>

        <View style={estilos.metricas}>
          <Metrica
            icone="cash-outline"
            rotulo="Custo estimado"
            valor={formatarReais(roteiro.totais.custoTotal.estimado)}
            detalhe={formatarFaixa(roteiro.totais.custoTotal)}
          />
          <Metrica
            icone="time-outline"
            rotulo="Duração"
            valor={formatarDuracao(roteiro.totais.duracaoMin)}
            detalhe={`de ${formatarDuracao(roteiro.tempoDisponivelMin)} disponíveis`}
          />
        </View>

        <View style={{ gap: espaco.xs, marginTop: espaco.md }}>
          <View style={estilos.linhaTopo}>
            <Texto variante="micro" cor={cores.textoSuave}>
              Uso do orçamento
            </Texto>
            <Texto variante="micro" peso="semi">
              {roteiro.totais.usoOrcamento}%
            </Texto>
          </View>
          <View style={estilos.trilha}>
            <View
              style={[
                estilos.progresso,
                {
                  width: `${roteiro.totais.usoOrcamento}%`,
                  backgroundColor:
                    roteiro.totais.usoOrcamento > 85 ? cores.alerta : cores.sucesso,
                },
              ]}
            />
          </View>
        </View>

        {roteiro.totais.trechosAPe > 0 ? (
          <View style={[estilos.linhaIcone, { marginTop: espaco.md }]}>
            <Ionicons name="walk" size={14} color={cores.sucesso} />
            <Texto variante="micro" cor={cores.sucesso}>
              {roteiro.totais.trechosAPe}{' '}
              {roteiro.totais.trechosAPe === 1 ? 'trecho a pé' : 'trechos a pé'}:{' '}
              {formatarReais(roteiro.totais.economiaCaminhando)} economizados
            </Texto>
          </View>
        ) : null}
      </Cartao>

      {/* ------------------------------------------ controle de orçamento */}
      <Cartao>
        <View style={estilos.linhaTopo}>
          <Texto variante="pequeno" peso="semi">
            E se eu tivesse outro orçamento?
          </Texto>
          <Texto variante="destaque" peso="forte" cor={cores.primaria}>
            {formatarReais(orcamentoExibido)}
          </Texto>
        </View>

        <Slider
          style={{ height: 40, marginTop: espaco.sm }}
          minimumValue={20}
          maximumValue={300}
          step={5}
          value={orcamentoExibido}
          minimumTrackTintColor={cores.primaria}
          maximumTrackTintColor={cores.borda}
          thumbTintColor={cores.primaria}
          onValueChange={setOrcamentoVisual}
          onSlidingComplete={(valor) => ajustarOrcamento.mutate(valor)}
        />

        <Texto variante="micro" cor={cores.textoSuave}>
          {ajustarOrcamento.isPending
            ? 'Refazendo a seleção de pontos...'
            : 'Arraste para ver o algoritmo refazer o roteiro.'}
        </Texto>
      </Cartao>

      {/* ----------------------------------------------------------- mapa */}
      <MapaRoteiro
        origem={roteiro.preferencias.origem}
        paradas={roteiro.itens.map<ParadaMapa>((item) => ({
          id: item.ponto.id,
          nome: item.ponto.nome,
          ordem: item.ordem,
          lat: item.ponto.coordenada.lat,
          lng: item.ponto.coordenada.lng,
          modalAteAqui: item.trechoAteAqui?.modal ?? null,
        }))}
      />

      {/* ----------------------------------------------------- percurso */}
      <View style={{ gap: espaco.md }}>
        <Texto variante="destaque" peso="forte">
          Seu percurso
        </Texto>

        {roteiro.itens.map((item) => (
          <ParadaDoRoteiro
            key={item.ponto.id}
            item={item}
            ocupado={ajustando}
            onRemover={() => remover.mutate(item.ponto.id)}
            onTrocar={() => substituir.mutate(item.ponto.id)}
          />
        ))}

        {roteiro.itens.length === 0 ? (
          <EstadoVazio
            icone="wallet-outline"
            titulo="Nada coube no orçamento"
            descricao="Aumente o valor disponível ou o tempo livre para que o algoritmo consiga montar um roteiro."
          />
        ) : null}
      </View>

      {/* --------------------------------------------------- descartados */}
      {roteiro.descartados.length > 0 ? (
        <View style={{ gap: espaco.sm }}>
          <Texto variante="destaque" peso="forte">
            Avaliados e deixados de fora
          </Texto>
          {roteiro.descartados.map((descartado) => (
            <LinhaDescartada key={descartado.ponto.id} descartado={descartado} />
          ))}
        </View>
      ) : null}

      {/* -------------------------------------------- painel do algoritmo */}
      <Cartao style={{ backgroundColor: cores.fundoAlt }}>
        <View style={estilos.linhaIcone}>
          <Ionicons name="hardware-chip-outline" size={14} color={cores.textoSuave} />
          <Texto variante="micro" peso="semi" cor={cores.textoSuave}>
            Processamento
          </Texto>
        </View>
        <Texto variante="micro" cor={cores.textoSuave} style={{ marginTop: 4 }}>
          {roteiro.diagnostico.candidatosAvaliados} pontos avaliados ·{' '}
          {roteiro.diagnostico.trechosCalculados} trechos calculados · roteiro montado em{' '}
          {roteiro.diagnostico.duracaoMs} ms
        </Texto>
      </Cartao>
    </ScrollView>
  );
}

/* ----------------------------------------------------------- componentes */

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
        <Ionicons name={icone} size={14} color={cores.textoSuave} />
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

function LinhaDescartada({ descartado }: { descartado: PontoDescartado }) {
  const cores = useCores();
  const estilos = useEstilos(cores);

  const paleta: Record<MotivoDescarte, { cor: string; fundo: string; icone: keyof typeof Ionicons.glyphMap }> = {
    orcamento: { cor: cores.erro, fundo: cores.erroSuave, icone: 'wallet-outline' },
    tempo: { cor: cores.alerta, fundo: cores.alertaSuave, icone: 'time-outline' },
    horario: { cor: cores.alerta, fundo: cores.alertaSuave, icone: 'lock-closed-outline' },
  };
  const estilo = paleta[descartado.motivo];

  return (
    <Cartao padding={espaco.md} style={{ backgroundColor: cores.fundoAlt }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.md }}>
        <View style={[estilos.circuloMotivo, { backgroundColor: estilo.fundo }]}>
          <Ionicons name={estilo.icone} size={16} color={estilo.cor} />
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

function ParadaDoRoteiro({
  item,
  ocupado,
  onRemover,
  onTrocar,
}: {
  item: ItemRoteiro;
  ocupado: boolean;
  onRemover: () => void;
  onTrocar: () => void;
}) {
  const cores = useCores();
  const estilos = useEstilos(cores);
  const trecho = item.trechoAteAqui;

  return (
    <View style={{ gap: espaco.sm }}>
      {trecho ? <TrechoAteAqui trecho={trecho} /> : null}

      <Cartao padding={espaco.md}>
        <View style={{ flexDirection: 'row', gap: espaco.md }}>
          <Image
            source={{ uri: item.ponto.fotoUrl ?? undefined }}
            style={estilos.foto}
            contentFit="cover"
          />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={estilos.linhaTopo}>
              <Texto variante="corpo" peso="semi" numberOfLines={1} style={{ flex: 1 }}>
                {item.ordem}. {item.ponto.nome}
              </Texto>
              <Texto variante="micro" peso="semi" cor={cores.primaria}>
                {formatarHora(item.chegadaPrevista)}
              </Texto>
            </View>

            <Texto variante="micro" cor={cores.textoSuave}>
              {rotuloCategoria[item.ponto.categoria]} ·{' '}
              {formatarDuracao(item.ponto.tempoVisitaMin)} de visita
              {item.custoNoLocal > 0 ? ` · ${formatarReais(item.custoNoLocal)}` : ''}
            </Texto>

            <View style={estilos.linhaIcone}>
              <Ionicons name="star" size={12} color={cores.alerta} />
              <Texto variante="micro" cor={cores.textoSuave}>
                {item.ponto.nota?.toFixed(1)} ({item.ponto.avaliacoes})
              </Texto>
            </View>

            <View style={{ flexDirection: 'row', gap: espaco.sm, marginTop: espaco.xs }}>
              <Botao
                titulo="Trocar"
                variante="contorno"
                icone="swap-horizontal"
                largura="auto"
                desabilitado={ocupado}
                onPress={onTrocar}
                style={{ height: 36, paddingHorizontal: espaco.md }}
              />
              <Botao
                titulo="Remover"
                variante="texto"
                icone="close"
                largura="auto"
                desabilitado={ocupado}
                onPress={onRemover}
                style={{ height: 36, paddingHorizontal: espaco.sm }}
              />
            </View>
          </View>
        </View>
      </Cartao>
    </View>
  );
}

/** Deslocamento até a parada, com a memória de cálculo da tarifa. */
function TrechoAteAqui({ trecho }: { trecho: Trecho }) {
  const cores = useCores();
  const estilos = useEstilos(cores);
  const [aberto, setAberto] = useState(false);

  if (trecho.modal === 'pe') {
    return (
      <View style={estilos.trecho}>
        <Ionicons name="walk" size={15} color={cores.sucesso} />
        <Texto variante="micro" cor={cores.textoSuave}>
          {formatarDistancia(trecho.distanciaKm)} · {formatarDuracao(trecho.duracaoMin)}
        </Texto>
        <View style={{ flex: 1 }} />
        <Selo texto="A pé · grátis" cor={cores.sucesso} fundo={cores.sucessoSuave} />
      </View>
    );
  }

  const c = trecho.calculo!;

  return (
    <View style={{ gap: espaco.xs }}>
      <Pressable onPress={() => setAberto((v) => !v)} style={estilos.trecho}>
        <Ionicons name="car" size={15} color={cores.textoSuave} />
        <Texto variante="micro" cor={cores.textoSuave}>
          {formatarDistancia(trecho.distanciaKm)} · {formatarDuracao(trecho.duracaoMin)}
        </Texto>
        <View style={{ flex: 1 }} />
        <Selo
          texto={`${formatarFaixa(trecho.custo)} · bandeira ${trecho.bandeira}`}
          cor={cores.primaria}
          fundo={cores.primariaSuave}
        />
        <Ionicons
          name={aberto ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={cores.textoSuave}
        />
      </Pressable>

      {aberto ? (
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
            <View style={estilos.separador} />
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
      ) : null}
    </View>
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

function useEstilos(cores: Paleta) {
  return useMemo(
    () =>
      StyleSheet.create({
        linhaTopo: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: espaco.sm,
        },
        linhaIcone: { flexDirection: 'row', alignItems: 'center', gap: espaco.xs },
        metricas: { flexDirection: 'row', gap: espaco.md, marginTop: espaco.md },
        trilha: {
          height: 8,
          borderRadius: raio.pilula,
          backgroundColor: cores.fundoAlt,
          overflow: 'hidden',
        },
        progresso: { height: 8, borderRadius: raio.pilula },
        trecho: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: espaco.xs,
          paddingHorizontal: espaco.sm,
        },
        foto: { width: 72, height: 72, borderRadius: raio.md, backgroundColor: cores.fundoAlt },
        circuloMotivo: {
          width: 34,
          height: 34,
          borderRadius: raio.pilula,
          alignItems: 'center',
          justifyContent: 'center',
        },
        separador: {
          height: 1,
          backgroundColor: cores.borda,
          marginVertical: espaco.xs,
        },
      }),
    [cores],
  );
}
