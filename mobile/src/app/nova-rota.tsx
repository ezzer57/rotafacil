/**
 * Nova rota (UI-05) - o núcleo do trabalho.
 *
 * Coleta as entradas do algoritmo: posição de partida, cidade, categorias de
 * interesse, teto de gasto (opcional), tempo disponível e horário de início.
 *
 * A posição vem do GPS do aparelho e aparece num mapa, com a margem de erro.
 * O usuário pode corrigir o ponto de partida tocando no mapa ou escolher o
 * centro da cidade. Quando a localização não está disponível - permissão
 * negada, GPS desligado, aparelho sem sinal ou usuário fora das cidades
 * atendidas -, o roteiro parte do centro da cidade escolhida, e a tela diz
 * isso com todas as letras em vez de fingir que sabe onde a pessoa está.
 */

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, ScrollView, View } from 'react-native';

import MapaPartida from '@/components/mapa/partida';
import { Botao, Cartao, Campo, Chip, Texto } from '@/components/ui';
import { RAIO_COBERTURA_CIDADE_KM, cidadeMaisProxima, haversine } from '@/domain/geo';
import {
  formatarDistancia,
  formatarDuracao,
  formatarReais,
  iconeCategoria,
  rotuloCategoria,
} from '@/domain/format';
import type { CategoriaPOI, Coordenada } from '@/domain/types';
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

/** De onde o roteiro parte: do GPS, de um toque no mapa ou do centro da cidade. */
type ModoPartida = 'gps' | 'manual' | 'centro';

/** Acima desta margem de erro, a tela pede para conferir o ponto no mapa. */
const PRECISAO_BAIXA_M = 100;

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
  /** Ponto que o usuário marcou no mapa; tem prioridade sobre o GPS. */
  const [partidaManual, setPartidaManual] = useState<Coordenada | null>(null);
  const [preferirCentro, setPreferirCentro] = useState(false);

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
  const gpsNaCidade =
    // 'solicitando' com coordenada é uma atualização: a posição anterior vale.
    (localizacao.estado === 'obtida' || localizacao.estado === 'solicitando') &&
    localizacao.coordenada != null &&
    detectada?.dentroDaCobertura === true &&
    detectada.cidade.id === cidadeId;

  const modo: ModoPartida = partidaManual
    ? 'manual'
    : gpsNaCidade && !preferirCentro
      ? 'gps'
      : 'centro';

  const origem =
    partidaManual ?? (modo === 'gps' ? localizacao.coordenada! : cidade?.centro);

  // A API recusa partida a mais de 60 km do centro; a tela avisa antes.
  const partidaLonge =
    cidade != null &&
    origem != null &&
    haversine(origem, cidade.centro) > RAIO_COBERTURA_CIDADE_KM;

  /** Ponto marcado no mapa pertence à cidade em que foi marcado. */
  function trocarCidade(id: string) {
    setCidadeId(id);
    setEscolhaManual(true);
    setPartidaManual(null);
    setPreferirCentro(false);
  }

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
    try {
      const roteiro = await gerar.mutateAsync({
        cidadeId: cidade.id,
        origem,
        categorias,
        orcamento: valorOrcamento,
        tempoDisponivelMin: tempoMin,
        inicioPrevisto: inicioPrevisto().toISOString(),
      });
      router.replace(`/roteiro/${roteiro.id}`);
    } catch {
      // A mensagem do serviço aparece acima do botão.
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <ScrollView
        contentContainerStyle={{ padding: espaco.lg, gap: espaco.xl, paddingBottom: 140 }}>
        {/* --------------------------------------------------- localização */}
        <View style={{ gap: espaco.md }}>
          <CartaoLocalizacao
            localizacao={localizacao}
            nomeCidade={cidade?.nome}
            detectada={detectada}
            modo={modo}
            gpsNaCidade={gpsNaCidade}
          />

          {origem ? (
            <>
              <MapaPartida
                posicao={gpsNaCidade ? localizacao.coordenada : null}
                precisaoM={gpsNaCidade ? localizacao.precisaoM : null}
                partida={origem}
                altura={200}
                onEscolher={setPartidaManual}
              />
              <Texto variante="micro" cor={cores.textoSuave}>
                Toque no mapa para ajustar o ponto de partida. O ponto com borda verde é de onde o
                roteiro sai.
              </Texto>
              <View style={{ flexDirection: 'row', gap: espaco.sm, flexWrap: 'wrap' }}>
                {gpsNaCidade ? (
                  <Chip
                    rotulo="Minha posição"
                    icone="navigate"
                    ativo={modo === 'gps'}
                    onPress={() => {
                      setPartidaManual(null);
                      setPreferirCentro(false);
                    }}
                  />
                ) : null}
                <Chip
                  rotulo={`Centro de ${cidade?.nome ?? 'cidade'}`}
                  icone="business"
                  ativo={modo === 'centro'}
                  onPress={() => {
                    setPartidaManual(null);
                    setPreferirCentro(true);
                  }}
                />
                {modo === 'manual' ? <Chip rotulo="Ponto no mapa" icone="pin" ativo /> : null}
              </View>
              {partidaLonge ? (
                <Texto variante="micro" cor={cores.erro}>
                  Esse ponto fica a mais de {RAIO_COBERTURA_CIDADE_KM} km do centro de{' '}
                  {cidade?.nome}. Escolha um ponto mais perto ou parta do centro.
                </Texto>
              ) : null}
            </>
          ) : null}
        </View>

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
                onPress={() => trocarCidade(c.id)}
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
            Partindo{' '}
            {modo === 'gps'
              ? 'da sua posição atual'
              : modo === 'manual'
                ? 'do ponto que você marcou no mapa'
                : `do centro de ${cidade?.nome ?? '-'}`}
          </Texto>
        </Cartao>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: espaco.lg,
          right: espaco.lg,
          bottom: espaco.xl,
          gap: espaco.sm,
        }}>
        {/* Fica junto do botão para aparecer sem precisar rolar a tela. */}
        {gerar.isError ? (
          <Cartao
            padding={espaco.md}
            style={{ backgroundColor: cores.erroSuave, borderColor: cores.erro }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.sm }}>
              <Ionicons name="alert-circle" size={16} color={cores.erro} />
              <Texto variante="pequeno" cor={cores.erro} style={{ flex: 1 }}>
                {(gerar.error as Error).message}
              </Texto>
            </View>
          </Cartao>
        ) : null}
        <Botao
          titulo={gerar.isPending ? 'Montando roteiro...' : 'Gerar roteiro'}
          icone="sparkles"
          carregando={gerar.isPending}
          desabilitado={partidaLonge}
          onPress={aoGerar}
        />
      </View>
    </View>
  );
}

/* --------------------------------------------------------------- auxiliar */

interface ConteudoLocalizacao {
  icone: keyof typeof Ionicons.glyphMap;
  cor: string;
  fundo: string;
  titulo: string;
  detalhe: string;
  acao: { rotulo: string; aoTocar: () => void } | null;
}

/**
 * Mostra de onde o roteiro vai partir. Ser explícito aqui atende ao
 * princípio da transparência da LGPD: o usuário vê quando a localização
 * está sendo usada e quando não está.
 */
function CartaoLocalizacao({
  localizacao,
  nomeCidade,
  detectada,
  modo,
  gpsNaCidade,
}: {
  localizacao: ReturnType<typeof useLocalizacao>;
  nomeCidade?: string;
  detectada: ReturnType<typeof cidadeMaisProxima>;
  modo: ModoPartida;
  gpsNaCidade: boolean;
}) {
  const cores = useCores();
  const cidade = nomeCidade ?? 'cidade';
  const tentarDeNovo = { rotulo: 'Tentar novamente', aoTocar: () => void localizacao.solicitar() };

  const conteudo = ((): ConteudoLocalizacao => {
    if (modo === 'manual') {
      return {
        icone: 'pin',
        cor: cores.sucesso,
        fundo: cores.sucessoSuave,
        titulo: 'Partindo do ponto que você marcou',
        detalhe: gpsNaCidade
          ? 'Toque em "Minha posição" para voltar a usar o GPS.'
          : `Toque em "Centro de ${cidade}" para desfazer.`,
        acao: null,
      };
    }

    if (modo === 'gps') {
      const precisao = localizacao.precisaoM != null ? Math.round(localizacao.precisaoM) : null;
      const atualizando = localizacao.refinando || localizacao.estado === 'solicitando';
      const imprecisa = localizacao.aproximada || (precisao != null && precisao > PRECISAO_BAIXA_M);

      const detalhe = (() => {
        if (atualizando) {
          return 'Melhorando a precisão com o GPS... O ponto no mapa pode se mexer um pouco.';
        }
        if (localizacao.aproximada) {
          return 'O aparelho liberou só a localização aproximada, que pode errar por quilômetros. Confira o ponto no mapa e toque no lugar certo se precisar.';
        }
        if (precisao == null) return 'O roteiro parte da sua posição atual.';
        if (imprecisa) {
          return `Margem de erro de cerca de ${precisao} m (círculo no mapa). Se o ponto estiver errado, toque no lugar certo ou atualize em um local aberto.`;
        }
        return `Margem de erro de cerca de ${precisao} m. O roteiro parte daqui.`;
      })();

      const alertar = imprecisa && !atualizando;
      return {
        icone: 'navigate-circle',
        cor: alertar ? cores.alerta : cores.sucesso,
        fundo: alertar ? cores.alertaSuave : cores.sucessoSuave,
        titulo: localizacao.descricao
          ? `Você está em ${localizacao.descricao}`
          : 'Usando sua posição atual',
        detalhe,
        acao: alertar
          ? { rotulo: 'Atualizar posição', aoTocar: () => void localizacao.solicitar() }
          : null,
      };
    }

    // Daqui em diante o roteiro parte do centro; o cartão explica o motivo.
    if (gpsNaCidade) {
      return {
        icone: 'business-outline',
        cor: cores.textoSuave,
        fundo: cores.fundoAlt,
        titulo: `Partindo do centro de ${cidade}`,
        detalhe: 'Toque em "Minha posição" para partir de onde você está.',
        acao: null,
      };
    }

    if (localizacao.estado === 'solicitando' || localizacao.estado === 'inicial') {
      return {
        icone: 'locate-outline',
        cor: cores.textoSuave,
        fundo: cores.fundoAlt,
        titulo: 'Obtendo sua localização...',
        detalhe: 'Autorize o acesso para o roteiro começar de onde você está.',
        acao: null,
      };
    }

    if (localizacao.estado === 'obtida' && detectada && !detectada.dentroDaCobertura) {
      return {
        icone: 'alert-circle-outline',
        cor: cores.alerta,
        fundo: cores.alertaSuave,
        titulo: 'Você está fora das cidades atendidas',
        detalhe: `A cidade mais próxima é ${detectada.cidade.nome}, a ${formatarDistancia(detectada.distanciaKm)} daqui. O roteiro vai partir do centro dela, ou do ponto que você tocar no mapa.`,
        acao: null,
      };
    }

    if (localizacao.estado === 'obtida') {
      return {
        icone: 'navigate-outline',
        cor: cores.textoSuave,
        fundo: cores.fundoAlt,
        titulo: `Partindo do centro de ${cidade}`,
        detalhe: 'Você escolheu uma cidade diferente da sua posição atual.',
        acao: null,
      };
    }

    const reserva = `Enquanto isso, o roteiro parte do centro de ${cidade} ou do ponto que você tocar no mapa.`;

    if (localizacao.estado === 'desligada') {
      return {
        icone: 'location-outline',
        cor: cores.alerta,
        fundo: cores.alertaSuave,
        titulo: 'A localização do aparelho está desligada',
        detalhe: `Ligue a localização (GPS) nas configurações rápidas do aparelho e tente de novo. ${reserva}`,
        acao: tentarDeNovo,
      };
    }

    if (localizacao.estado === 'negada') {
      // Depois de negar de vez, o sistema não mostra mais o pedido de permissão.
      const abrirAjustes = localizacao.precisaAbrirAjustes && Platform.OS !== 'web';
      return {
        icone: 'location-outline',
        cor: cores.alerta,
        fundo: cores.alertaSuave,
        titulo: 'Sem acesso à sua localização',
        detalhe: abrirAjustes
          ? `Libere a localização para o RotaFácil nos ajustes do aparelho. ${reserva}`
          : reserva,
        acao: abrirAjustes
          ? { rotulo: 'Abrir ajustes', aoTocar: () => void Linking.openSettings() }
          : tentarDeNovo,
      };
    }

    return {
      icone: 'location-outline',
      cor: cores.alerta,
      fundo: cores.alertaSuave,
      titulo: 'Não foi possível obter sua localização',
      detalhe: `${localizacao.erro ? `${localizacao.erro.replace(/\.$/, '')}. ` : ''}${reserva}`,
      acao: tentarDeNovo,
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
              titulo={conteudo.acao.rotulo}
              variante="texto"
              largura="auto"
              onPress={conteudo.acao.aoTocar}
              style={{ height: 32, paddingHorizontal: 0, marginTop: espaco.xs }}
            />
          ) : null}
        </View>
      </View>
    </Cartao>
  );
}
