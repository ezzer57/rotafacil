/**
 * Nova rota (UI-05) - o núcleo do trabalho.
 *
 * Coleta as entradas do algoritmo: cidade, categorias de interesse,
 * orçamento, tempo disponível e horário de início. Esta tela não existia no
 * Figma original e é o que diferencia o RotaFácil de um guia turístico comum.
 *
 * O horário de início não é detalhe: é ele que faz o algoritmo aplicar a
 * bandeira 2 à noite e descartar pontos que já estarão fechados.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Botao, Cartao, Campo, Chip, Texto } from '@/components/ui';
import {
  formatarDuracao,
  formatarReais,
  iconeCategoria,
  rotuloCategoria,
} from '@/domain/format';
import type { CategoriaPOI } from '@/domain/types';
import { useCidades, useGerarRoteiro } from '@/hooks/use-rotafacil';
import { useCores } from '@/theme/provider';
import { espaco } from '@/theme/tokens';

const CATEGORIAS: CategoriaPOI[] = [
  'cultura',
  'natureza',
  'gastronomia',
  'compras',
  'religioso',
  'vidaNoturna',
];

const TEMPOS = [120, 240, 360, 480];
const ORCAMENTOS = [30, 50, 80, 150];

/** null = agora; os demais são horas do dia de hoje. */
const HORARIOS: { rotulo: string; hora: number | null }[] = [
  { rotulo: 'Agora', hora: null },
  { rotulo: '09:00', hora: 9 },
  { rotulo: '14:00', hora: 14 },
  { rotulo: '22:30', hora: 22.5 },
];

export default function TelaNovaRota() {
  const router = useRouter();
  const { cidadeId: cidadeParam } = useLocalSearchParams<{ cidadeId?: string }>();
  const { data: cidades } = useCidades();
  const gerar = useGerarRoteiro();
  const cores = useCores();

  const [cidadeId, setCidadeId] = useState(cidadeParam ?? 'quixada');
  const [categorias, setCategorias] = useState<CategoriaPOI[]>(['natureza', 'gastronomia']);
  const [orcamento, setOrcamento] = useState('80');
  const [tempoMin, setTempoMin] = useState(240);
  const [horaInicio, setHoraInicio] = useState<number | null>(null);

  const cidade = useMemo(
    () => cidades?.find((c) => c.id === cidadeId) ?? cidades?.[0],
    [cidades, cidadeId],
  );

  const valorOrcamento = Number(orcamento.replace(',', '.')) || 0;

  const alternarCategoria = (c: CategoriaPOI) =>
    setCategorias((atual) => (atual.includes(c) ? atual.filter((x) => x !== c) : [...atual, c]));

  function inicioPrevisto(): Date {
    const data = new Date();
    if (horaInicio != null) {
      data.setHours(Math.floor(horaInicio), (horaInicio % 1) * 60, 0, 0);
    }
    return data;
  }

  /** Bandeira 2 vale das 22h às 6h e aos domingos (ver seção 3.7.2). */
  const noturno = (() => {
    const d = inicioPrevisto();
    return d.getHours() >= 22 || d.getHours() < 6 || d.getDay() === 0;
  })();

  async function aoGerar() {
    if (!cidade) return;
    const roteiro = await gerar.mutateAsync({
      cidadeId: cidade.id,
      origem: cidade.centro, // será substituído pelo GPS quando a localização entrar
      categorias,
      orcamento: valorOrcamento,
      tempoDisponivelMin: tempoMin,
      inicioPrevisto: inicioPrevisto().toISOString(),
    });
    router.replace(`/roteiro/${roteiro.id}`);
  }

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <ScrollView
        contentContainerStyle={{ padding: espaco.lg, gap: espaco.xl, paddingBottom: 140 }}>
        {/* --------------------------------------------------------- cidade */}
        <View style={{ gap: espaco.md }}>
          <Texto variante="titulo" peso="forte">
            Onde você está?
          </Texto>
          <View style={{ flexDirection: 'row', gap: espaco.sm, flexWrap: 'wrap' }}>
            {(cidades ?? []).map((c) => (
              <Chip
                key={c.id}
                rotulo={`${c.bandeira} ${c.nome}`}
                ativo={c.id === cidadeId}
                onPress={() => setCidadeId(c.id)}
              />
            ))}
          </View>
          <Texto variante="micro" cor={cores.textoSuave}>
            Na versão final a posição vem do GPS do aparelho.
          </Texto>
        </View>

        {/* ----------------------------------------------------- categorias */}
        <View style={{ gap: espaco.md }}>
          <Texto variante="titulo" peso="forte">
            O que te interessa?
          </Texto>
          <View style={{ flexDirection: 'row', gap: espaco.sm, flexWrap: 'wrap' }}>
            {CATEGORIAS.map((c) => (
              <Chip
                key={c}
                rotulo={rotuloCategoria[c]}
                icone={iconeCategoria[c] as any}
                ativo={categorias.includes(c)}
                onPress={() => alternarCategoria(c)}
              />
            ))}
          </View>
        </View>

        {/* ------------------------------------------------------ orçamento */}
        <View style={{ gap: espaco.md }}>
          <Texto variante="titulo" peso="forte">
            Quanto pode gastar hoje?
          </Texto>
          <View style={{ flexDirection: 'row', gap: espaco.sm, flexWrap: 'wrap' }}>
            {ORCAMENTOS.map((valor) => (
              <Chip
                key={valor}
                rotulo={formatarReais(valor)}
                ativo={valorOrcamento === valor}
                onPress={() => setOrcamento(String(valor))}
              />
            ))}
          </View>
          <Campo
            icone="wallet"
            rotulo="Ou informe outro valor (R$)"
            keyboardType="numeric"
            value={orcamento}
            onChangeText={setOrcamento}
            placeholder="80"
          />
          <Texto variante="micro" cor={cores.textoSuave}>
            Inclui deslocamento e gastos nos locais. O roteiro é montado para caber nesse valor.
          </Texto>
        </View>

        {/* ---------------------------------------------------------- tempo */}
        <View style={{ gap: espaco.md }}>
          <Texto variante="titulo" peso="forte">
            Quanto tempo tem livre?
          </Texto>
          <View style={{ flexDirection: 'row', gap: espaco.sm, flexWrap: 'wrap' }}>
            {TEMPOS.map((t) => (
              <Chip
                key={t}
                rotulo={formatarDuracao(t)}
                ativo={t === tempoMin}
                onPress={() => setTempoMin(t)}
              />
            ))}
          </View>
        </View>

        {/* -------------------------------------------------------- horário */}
        <View style={{ gap: espaco.md }}>
          <Texto variante="titulo" peso="forte">
            Começando quando?
          </Texto>
          <View style={{ flexDirection: 'row', gap: espaco.sm, flexWrap: 'wrap' }}>
            {HORARIOS.map((h) => (
              <Chip
                key={h.rotulo}
                rotulo={h.rotulo}
                ativo={horaInicio === h.hora}
                onPress={() => setHoraInicio(h.hora)}
              />
            ))}
          </View>
          {noturno ? (
            <Cartao
              padding={espaco.md}
              style={{ backgroundColor: cores.alertaSuave, borderColor: cores.alertaSuave }}>
              <Texto variante="micro" peso="semi" cor={cores.alerta}>
                Horário de bandeira 2
              </Texto>
              <Texto variante="micro" cor={cores.textoSuave} style={{ marginTop: 2 }}>
                A tarifa por quilômetro é maior, e pontos que fecham cedo serão descartados.
              </Texto>
            </Cartao>
          ) : null}
        </View>

        {/* --------------------------------------------------------- resumo */}
        <Cartao style={{ backgroundColor: cores.primariaSuave, borderColor: cores.primariaSuave }}>
          <Texto variante="pequeno" peso="semi" cor={cores.primaria}>
            Resumo do pedido
          </Texto>
          <Texto variante="corpo" style={{ marginTop: espaco.xs }}>
            {cidade?.nome ?? '-'} · até {formatarReais(valorOrcamento)} em{' '}
            {formatarDuracao(tempoMin)}, a partir das{' '}
            {inicioPrevisto().toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Texto>
        </Cartao>
      </ScrollView>

      <View style={{ position: 'absolute', left: espaco.lg, right: espaco.lg, bottom: espaco.xl }}>
        <Botao
          titulo={gerar.isPending ? 'Montando roteiro...' : 'Gerar roteiro'}
          icone="sparkles"
          carregando={gerar.isPending}
          desabilitado={valorOrcamento <= 0}
          onPress={aoGerar}
        />
      </View>
    </View>
  );
}
