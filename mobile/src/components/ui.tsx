/**
 * Biblioteca de componentes visuais do RotaFacil (UI-01).
 *
 * Todos os componentes leem a paleta ativa por useCores(), portanto
 * funcionam nos temas claro e escuro sem nenhuma condicional nas telas.
 */

import { Ionicons } from '@expo/vector-icons';
import { useMemo, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { useCores } from '@/theme/provider';
import { espaco, fonte, raio, sombra, type Paleta } from '@/theme/tokens';

/* ------------------------------------------------------------- tipografia */

type TextoProps = {
  children: ReactNode;
  variante?: 'display' | 'titulo' | 'destaque' | 'corpo' | 'pequeno' | 'micro';
  cor?: string;
  peso?: 'normal' | 'medio' | 'semi' | 'forte';
  style?: StyleProp<any>;
  numberOfLines?: number;
};

export function Texto({
  children,
  variante = 'corpo',
  cor,
  peso = 'normal',
  style,
  numberOfLines,
}: TextoProps) {
  const cores = useCores();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontSize: fonte.tamanho[variante],
          color: cor ?? cores.texto,
          fontWeight: fonte.peso[peso],
        },
        style,
      ]}>
      {children}
    </Text>
  );
}

/* ------------------------------------------------------------------ botao */

type BotaoProps = {
  titulo: string;
  onPress?: () => void;
  variante?: 'principal' | 'secundario' | 'contorno' | 'texto';
  icone?: keyof typeof Ionicons.glyphMap;
  carregando?: boolean;
  desabilitado?: boolean;
  largura?: 'total' | 'auto';
  style?: StyleProp<ViewStyle>;
};

export function Botao({
  titulo,
  onPress,
  variante = 'principal',
  icone,
  carregando,
  desabilitado,
  largura = 'total',
  style,
}: BotaoProps) {
  const cores = useCores();
  const estilos = useEstilos(cores);

  const paleta = {
    principal: { fundo: cores.tinta, texto: cores.tintaTexto, borda: 'transparent' },
    secundario: { fundo: cores.primaria, texto: '#FFFFFF', borda: 'transparent' },
    contorno: { fundo: 'transparent', texto: cores.texto, borda: cores.bordaForte },
    texto: { fundo: 'transparent', texto: cores.primaria, borda: 'transparent' },
  }[variante];

  const inativo = desabilitado || carregando;

  return (
    <Pressable
      onPress={inativo ? undefined : onPress}
      style={({ pressed }) => [
        estilos.botao,
        {
          backgroundColor: paleta.fundo,
          borderColor: paleta.borda,
          opacity: inativo ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: largura === 'total' ? 'stretch' : 'flex-start',
        },
        style,
      ]}>
      {carregando ? (
        <ActivityIndicator color={paleta.texto} />
      ) : (
        <>
          {icone ? <Ionicons name={icone} size={18} color={paleta.texto} /> : null}
          <Texto variante="corpo" peso="semi" cor={paleta.texto}>
            {titulo}
          </Texto>
        </>
      )}
    </Pressable>
  );
}

/* ----------------------------------------------------------------- cartao */

export function Cartao({
  children,
  style,
  onPress,
  padding = espaco.lg,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padding?: number;
}) {
  const estilos = useEstilos(useCores());
  const conteudo = <View style={[estilos.cartao, { padding }, style]}>{children}</View>;
  if (!onPress) return conteudo;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      {conteudo}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ campo */

export function Campo({
  rotulo,
  icone,
  ...props
}: TextInputProps & { rotulo?: string; icone?: keyof typeof Ionicons.glyphMap }) {
  const cores = useCores();
  const estilos = useEstilos(cores);
  return (
    <View style={{ gap: espaco.xs }}>
      {rotulo ? (
        <Texto variante="pequeno" peso="medio" cor={cores.textoSuave}>
          {rotulo}
        </Texto>
      ) : null}
      <View style={estilos.campo}>
        {icone ? <Ionicons name={icone} size={18} color={cores.textoSuave} /> : null}
        <TextInput
          placeholderTextColor={cores.textoSuave}
          style={{ flex: 1, fontSize: fonte.tamanho.corpo, color: cores.texto }}
          {...props}
        />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------- chip e selo */

export function Chip({
  rotulo,
  ativo,
  icone,
  onPress,
}: {
  rotulo: string;
  ativo?: boolean;
  icone?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}) {
  const cores = useCores();
  const estilos = useEstilos(cores);
  return (
    <Pressable
      onPress={onPress}
      style={[
        estilos.chip,
        {
          backgroundColor: ativo ? cores.primariaSuave : cores.fundoAlt,
          borderColor: ativo ? cores.primaria : cores.borda,
        },
      ]}>
      {icone ? (
        <Ionicons name={icone} size={15} color={ativo ? cores.primaria : cores.textoSuave} />
      ) : null}
      <Texto variante="pequeno" peso="medio" cor={ativo ? cores.primaria : cores.textoSuave}>
        {rotulo}
      </Texto>
    </Pressable>
  );
}

export function Selo({
  texto,
  cor,
  fundo,
  icone,
}: {
  texto: string;
  cor?: string;
  fundo?: string;
  icone?: keyof typeof Ionicons.glyphMap;
}) {
  const cores = useCores();
  const estilos = useEstilos(cores);
  const corTexto = cor ?? cores.textoSuave;
  return (
    <View style={[estilos.selo, { backgroundColor: fundo ?? cores.fundoAlt }]}>
      {icone ? <Ionicons name={icone} size={12} color={corTexto} /> : null}
      <Texto variante="micro" peso="semi" cor={corTexto}>
        {texto}
      </Texto>
    </View>
  );
}

/* ----------------------------------------------------------------- secoes */

export function CabecalhoSecao({
  titulo,
  acao,
  onPressAcao,
}: {
  titulo: string;
  acao?: string;
  onPressAcao?: () => void;
}) {
  const cores = useCores();
  const estilos = useEstilos(cores);
  return (
    <View style={estilos.cabecalhoSecao}>
      <Texto variante="destaque" peso="forte">
        {titulo}
      </Texto>
      {acao ? (
        <Pressable onPress={onPressAcao}>
          <Texto variante="pequeno" peso="semi" cor={cores.primaria}>
            {acao}
          </Texto>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ---------------------------------------------------------------- estados */

export function Esqueleto({
  altura = 16,
  largura = '100%',
  arredondado = raio.sm,
}: {
  altura?: number;
  largura?: number | `${number}%`;
  arredondado?: number;
}) {
  const cores = useCores();
  return (
    <View
      style={{
        height: altura,
        width: largura,
        borderRadius: arredondado,
        backgroundColor: cores.fundoAlt,
      }}
    />
  );
}

export function EstadoVazio({
  icone = 'map-outline',
  titulo,
  descricao,
  acao,
  onPressAcao,
}: {
  icone?: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descricao?: string;
  acao?: string;
  onPressAcao?: () => void;
}) {
  const cores = useCores();
  const estilos = useEstilos(cores);
  return (
    <View style={estilos.estadoVazio}>
      <View style={estilos.circuloIcone}>
        <Ionicons name={icone} size={26} color={cores.primaria} />
      </View>
      <Texto variante="destaque" peso="semi">
        {titulo}
      </Texto>
      {descricao ? (
        <Texto variante="pequeno" cor={cores.textoSuave} style={{ textAlign: 'center' }}>
          {descricao}
        </Texto>
      ) : null}
      {acao ? <Botao titulo={acao} onPress={onPressAcao} largura="auto" /> : null}
    </View>
  );
}

/* ---------------------------------------------------------------- estilos */

/**
 * Folha de estilos derivada da paleta ativa. Fica em um hook (e nao em um
 * StyleSheet.create no topo do arquivo) porque as cores mudam em tempo de
 * execucao quando o usuario troca de tema.
 */
function useEstilos(cores: Paleta) {
  return useMemo(
    () =>
      StyleSheet.create({
        botao: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: espaco.sm,
          height: 50,
          paddingHorizontal: espaco.xl,
          borderRadius: raio.md,
          borderWidth: 1,
        },
        cartao: {
          backgroundColor: cores.superficie,
          borderRadius: raio.lg,
          borderWidth: 1,
          borderColor: cores.borda,
          ...sombra.cartao,
        },
        campo: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: espaco.sm,
          height: 50,
          paddingHorizontal: espaco.lg,
          borderRadius: raio.md,
          borderWidth: 1,
          borderColor: cores.borda,
          backgroundColor: cores.fundoAlt,
        },
        chip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: espaco.xs,
          paddingHorizontal: espaco.md,
          paddingVertical: espaco.sm,
          borderRadius: raio.pilula,
          borderWidth: 1,
        },
        selo: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: espaco.sm,
          paddingVertical: 4,
          borderRadius: raio.pilula,
        },
        cabecalhoSecao: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: espaco.md,
        },
        estadoVazio: {
          alignItems: 'center',
          gap: espaco.md,
          paddingVertical: espaco.xxl,
          paddingHorizontal: espaco.xl,
        },
        circuloIcone: {
          width: 56,
          height: 56,
          borderRadius: raio.pilula,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: cores.primariaSuave,
        },
      }),
    [cores],
  );
}
