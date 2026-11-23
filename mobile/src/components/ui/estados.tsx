/**
 * Estados das telas: carregando (esqueleto), vazio, falha ao carregar e aviso
 * de ação que falhou.
 */

import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { ErroApi } from '@/data/erros';
import { useCores } from '@/theme/provider';
import { espaco, raio } from '@/theme/tokens';
import { Botao } from './botao';
import { Texto } from './texto';

/** Bloco cinza no lugar do conteúdo enquanto ele carrega. */
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
      aria-hidden
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
  return (
    <View
      style={{
        alignItems: 'center',
        gap: espaco.md,
        paddingVertical: espaco.xxl,
        paddingHorizontal: espaco.xl,
      }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: raio.pilula,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: cores.primariaSuave,
        }}>
        <Ionicons name={icone} size={26} color={cores.primaria} aria-hidden />
      </View>
      <Texto variante="destaque" peso="semi" style={{ textAlign: 'center' }}>
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

/**
 * Falha ao carregar uma lista ou tela. Sem conexão é o caso mais comum no
 * celular, e o que mais pede "tentar de novo"; o resto mostra a mensagem da API.
 */
export function ErroAoCarregar({
  erro,
  onTentarDeNovo,
  titulo = 'Não foi possível carregar',
}: {
  erro: unknown;
  onTentarDeNovo: () => void;
  titulo?: string;
}) {
  const semRede = erro instanceof ErroApi && erro.status === 0;
  return (
    <EstadoVazio
      icone={semRede ? 'cloud-offline-outline' : 'warning-outline'}
      titulo={semRede ? 'Sem conexão' : titulo}
      descricao={
        semRede
          ? 'Confira a internet do aparelho e tente de novo.'
          : erro instanceof Error
            ? erro.message
            : 'Tente de novo em instantes.'
      }
      acao="Tentar de novo"
      onPressAcao={onTentarDeNovo}
    />
  );
}

/**
 * Aviso de que uma ação falhou (trocar, remover, entrar...), com a mensagem
 * da API e um botão para dispensar.
 */
export function AvisoDeErro({ mensagem, onFechar }: { mensagem: string; onFechar?: () => void }) {
  const cores = useCores();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: espaco.sm,
        padding: espaco.md,
        borderRadius: raio.md,
        backgroundColor: cores.erroSuave,
      }}>
      <Ionicons name="alert-circle" size={18} color={cores.erro} aria-hidden />
      {/* Só a mensagem é o alerta: o botão continua um elemento à parte. */}
      <View accessible role="alert" aria-live="assertive" style={{ flex: 1 }}>
        <Texto variante="pequeno" cor={cores.erro}>
          {mensagem}
        </Texto>
      </View>
      {onFechar ? (
        <Botao
          titulo="Ok"
          rotuloAcessivel="Dispensar o aviso"
          variante="texto"
          largura="auto"
          onPress={onFechar}
          style={{ minHeight: 32, paddingHorizontal: espaco.sm }}
        />
      ) : null}
    </View>
  );
}
