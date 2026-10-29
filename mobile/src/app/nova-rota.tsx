/**
 * Nova rota (UI-05) - o núcleo do trabalho.
 *
 * Coleta as entradas do algoritmo: posição de partida, cidade, categorias de
 * interesse, teto de gasto (opcional), tempo disponível e horário de início.
 *
 * A posição vem do GPS do aparelho. Quando a localização não está disponível
 * - permissão negada, aparelho sem sinal ou usuário fora das cidades
 * atendidas -, o roteiro parte do centro da cidade escolhida, e a tela diz
 * isso com todas as letras em vez de fingir que sabe onde a pessoa está.
 */

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Botao, Cartao, Campo, Chip, Texto } from '@/components/ui';
import { cidadeMaisProxima } from '@/domain/geo';
import {
  formatarDistancia,
  formatarDuracao,
  formatarReais,
  iconeCategoria,
  rotuloCategoria,
} from '@/domain/format';
import type { CategoriaPOI } from '@/domain/types';
import { useCidades, useGerarRoteiro } from '@/hooks/use-rotafacil';
import { useLocalizacao } from '@/hooks/use-localizacao';
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
  const localizacao = useLocalizacao();

  const [cidadeId, setCidadeId] = useState(cidadeParam ?? 'quixada');
  const [escolhaManual, setEscolhaManual] = useState(Boolean(cidadeParam));
  const [categorias, setCategorias] = useState<CategoriaPOI[]>(['natureza', 'gastronomia']);
  // Vazio é "sem limite", o padrão: o usuário só define um teto se quiser.
  const [orcamento, setOrcamento] = useState('');
  const [tempoMin, setTempoMin] = useState(240);
  const [horaInicio, setHoraInicio] = useState<number | null>(null);

  /** Em qual cidade atendida o GPS indica que o usuário está. */
  const detectada = useMemo(
    () =>
      localizacao.coordenada && cidades
        ? cidadeMaisProxima(localizacao.coordenada, cidades)
        : null,
    [localizacao.coordenada, cidades],
  );

  // Seleciona a cidade sozinho, a menos que o usuário já tenha escolhido.
  useEffect(() => {
    if (escolhaManual) return;
    if (detectada?.dentroDaCobertura) setCidadeId(detectada.cidade.id);
  }, [detectada, escolhaManual]);

  const cidade = useMemo(
    () => cidades?.find((c) => c.id === cidadeId) ?? cidades?.[0],
    [cidades, cidadeId],
  );

  /**
   * Só usa a coordenada real quando ela cai dentro de uma cidade atendida.
   * Partir de uma posição a centenas de quilômetros dos pontos cadastrados
   * geraria um roteiro sem sentido.
   */
  const usandoGps =
    localizacao.estado === 'obtida' &&
    localizacao.coordenada != null &&
    detectada?.dentroDaCobertura === true &&
    detectada.cidade.id === cidadeId;

  const origem = usandoGps ? localizacao.coordenada! : cidade?.centro;

  const teto = Number(orcamento.replace(',', '.'));
  const valorOrcamento = teto > 0 ? teto : null;

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
    if (!cidade || !origem) return;
    const roteiro = await gerar.mutateAsync({
      cidadeId: cidade.id,
      origem,
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
        {/* --------------------------------------------------- localização */}
        <CartaoLocalizacao
          localizacao={localizacao}
          nomeCidade={cidade?.nome}
          detectada={detectada}
          usandoGps={usandoGps}
        />

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
                onPress={() => {
                  setCidadeId(c.id);
                  setEscolhaManual(true);
                }}
              />
            ))}
          </View>
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
            Quer limitar o gasto?
          </Texto>
          <View style={{ flexDirection: 'row', gap: espaco.sm, flexWrap: 'wrap' }}>
            <Chip
              rotulo="Sem limite"
              icone="infinite"
              ativo={valorOrcamento == null}
              onPress={() => setOrcamento('')}
            />
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
            rotulo="Ou defina outro teto (R$)"
            keyboardType="numeric"
            value={orcamento}
            onChangeText={setOrcamento}
            placeholder="Sem limite"
          />
          <Texto variante="micro" cor={cores.textoSuave}>
            {valorOrcamento == null
              ? 'O roteiro mostra o custo médio previsto. Mesmo sem limite, caminhadas e lugares mais baratos têm preferência.'
              : 'Inclui deslocamento e gastos nos locais. O roteiro é montado para caber nesse valor.'}
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
            {cidade?.nome ?? '-'} ·{' '}
            {valorOrcamento == null ? 'sem limite de gasto' : `até ${formatarReais(valorOrcamento)}`}{' '}
            em {formatarDuracao(tempoMin)}, a partir das{' '}
            {inicioPrevisto().toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Texto>
          <Texto variante="micro" cor={cores.textoSuave} style={{ marginTop: 2 }}>
            Partindo {usandoGps ? 'da sua posição atual' : `do centro de ${cidade?.nome ?? '-'}`}
          </Texto>
        </Cartao>
      </ScrollView>

      <View style={{ position: 'absolute', left: espaco.lg, right: espaco.lg, bottom: espaco.xl }}>
        <Botao
          titulo={gerar.isPending ? 'Montando roteiro...' : 'Gerar roteiro'}
          icone="sparkles"
          carregando={gerar.isPending}
          onPress={aoGerar}
        />
      </View>
    </View>
  );
}

/* --------------------------------------------------------------- auxiliar */

/**
 * Mostra de onde o roteiro vai partir. Ser explícito aqui atende ao
 * princípio da transparência da LGPD: o usuário vê quando a localização
 * está sendo usada e quando não está.
 */
function CartaoLocalizacao({
  localizacao,
  nomeCidade,
  detectada,
  usandoGps,
}: {
  localizacao: ReturnType<typeof useLocalizacao>;
  nomeCidade?: string;
  detectada: ReturnType<typeof cidadeMaisProxima>;
  usandoGps: boolean;
}) {
  const cores = useCores();

  const conteudo = (() => {
    if (localizacao.estado === 'solicitando' || localizacao.estado === 'inicial') {
      return {
        icone: 'locate-outline' as const,
        cor: cores.textoSuave,
        fundo: cores.fundoAlt,
        titulo: 'Obtendo sua localização...',
        detalhe: 'Autorize o acesso para o roteiro começar de onde você está.',
        acao: null,
      };
    }

    if (usandoGps) {
      return {
        icone: 'navigate-circle' as const,
        cor: cores.sucesso,
        fundo: cores.sucessoSuave,
        titulo: localizacao.descricao
          ? `Você está em ${localizacao.descricao}`
          : 'Usando sua posição atual',
        detalhe: localizacao.precisaoM
          ? `Precisão de cerca de ${Math.round(localizacao.precisaoM)} m. O roteiro parte daqui.`
          : 'O roteiro parte da sua posição atual.',
        acao: null,
      };
    }

    if (localizacao.estado === 'obtida' && detectada && !detectada.dentroDaCobertura) {
      return {
        icone: 'alert-circle-outline' as const,
        cor: cores.alerta,
        fundo: cores.alertaSuave,
        titulo: 'Você está fora das cidades atendidas',
        detalhe: `A cidade mais próxima é ${detectada.cidade.nome}, a ${formatarDistancia(detectada.distanciaKm)} daqui. O roteiro vai partir do centro dela.`,
        acao: null,
      };
    }

    if (localizacao.estado === 'obtida') {
      return {
        icone: 'navigate-outline' as const,
        cor: cores.textoSuave,
        fundo: cores.fundoAlt,
        titulo: `Partindo do centro de ${nomeCidade ?? 'cidade'}`,
        detalhe: 'Você escolheu uma cidade diferente da sua posição atual.',
        acao: null,
      };
    }

    return {
      icone: 'location-outline' as const,
      cor: cores.alerta,
      fundo: cores.alertaSuave,
      titulo:
        localizacao.estado === 'negada'
          ? 'Sem acesso à sua localização'
          : 'Não foi possível obter sua localização',
      detalhe: `O roteiro vai partir do centro de ${nomeCidade ?? 'cidade'}.`,
      acao: 'Tentar novamente',
    };
  })();

  return (
    <Cartao style={{ backgroundColor: conteudo.fundo, borderColor: conteudo.fundo }}>
      <View style={{ flexDirection: 'row', gap: espaco.md }}>
        <Ionicons name={conteudo.icone} size={20} color={conteudo.cor} />
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="pequeno" peso="semi" cor={conteudo.cor}>
            {conteudo.titulo}
          </Texto>
          <Texto variante="micro" cor={cores.textoSuave}>
            {conteudo.detalhe}
          </Texto>
          {conteudo.acao ? (
            <Botao
              titulo={conteudo.acao}
              variante="texto"
              largura="auto"
              onPress={() => void localizacao.solicitar()}
              style={{ height: 32, paddingHorizontal: 0, marginTop: espaco.xs }}
            />
          ) : null}
        </View>
      </View>
    </Cartao>
  );
}
