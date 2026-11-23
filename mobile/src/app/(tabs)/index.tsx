/**
 * Tela inicial (UI-04).
 *
 * Estrutura inspirada no Figma: saudação, busca de cidade, destinos e viagens
 * recentes, com o botão flutuante de nova rota. O ícone de sol/lua alterna o
 * tema.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FotoDoLugar } from '@/components/foto';
import { CartaoDoRoteiro } from '@/components/historico/cartao-do-roteiro';
import {
  Botao,
  CabecalhoSecao,
  Campo,
  ErroAoCarregar,
  Esqueleto,
  EstadoVazio,
  Texto,
} from '@/components/ui';
import { useCidades, useHistorico, useUsuario } from '@/hooks/use-rotafacil';
import { useTema } from '@/theme/provider';
import { espaco, raio, sombra, type Paleta } from '@/theme/tokens';

/** Capas das cidades: fotos do Wikimedia Commons, com licença livre e crédito. */
const capaCidade: Record<string, { url: string; credito: string }> = {
  quixada: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/aa/A%C3%A7ude_Cedro_-_Cart%C3%A3o_postal_do_Cear%C3%A1.jpg/500px-A%C3%A7ude_Cedro_-_Cart%C3%A3o_postal_do_Cear%C3%A1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    credito: 'Foto: GLandovsky · CC BY-SA 4.0 · Wikimedia Commons',
  },
  fortaleza: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/Praia_de_Iracema_em_Fortaleza_02.jpg/500px-Praia_de_Iracema_em_Fortaleza_02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    credito: 'Foto: Keijuu · CC BY-SA 4.0 · Wikimedia Commons',
  },
};

export default function TelaInicio() {
  const router = useRouter();
  const { cores, escuro, alternar } = useTema();
  const estilos = useEstilos(cores);
  const [busca, setBusca] = useState('');
  const { data: usuario } = useUsuario();
  const cidadesConsulta = useCidades();
  const historicoConsulta = useHistorico();
  const historico = historicoConsulta.data;
  const termo = busca.trim().toLowerCase();
  const cidadesVisiveis = (cidadesConsulta.data ?? []).filter((c) =>
    c.nome.toLowerCase().includes(termo),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: espaco.lg, paddingBottom: 120, gap: espaco.xl }}
        showsVerticalScrollIndicator={false}>
        {/* ----------------------------------------------------- cabeçalho */}
        <View style={estilos.topo}>
          <View style={estilos.marca}>
            <View style={estilos.logo}>
              <Ionicons name="navigate" size={18} color={cores.textoSobrePrimaria} aria-hidden />
            </View>
            <Texto variante="destaque" peso="forte">
              RotaFácil
            </Texto>
          </View>

          <View style={{ flexDirection: 'row', gap: espaco.sm }}>
            <Pressable
              style={estilos.botaoRedondo}
              onPress={alternar}
              role="button"
              aria-label={escuro ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}>
              <Ionicons
                name={escuro ? 'sunny' : 'moon'}
                size={18}
                color={escuro ? cores.alerta : cores.textoSuave}
                aria-hidden
              />
            </Pressable>
            <Pressable
              style={estilos.botaoRedondo}
              onPress={() => router.push('/perfil')}
              role="button"
              aria-label="Abrir o perfil">
              <Ionicons name="person" size={18} color={cores.textoSuave} aria-hidden />
            </Pressable>
          </View>
        </View>

        <View style={{ gap: espaco.md }}>
          <Texto variante="display" peso="forte">
            Olá, {usuario?.nome ?? 'viajante'}
          </Texto>
          <Texto variante="corpo" cor={cores.textoSuave}>
            Monte um roteiro que cabe no seu tempo e no seu bolso.
          </Texto>
          <Campo icone="search" placeholder="Buscar cidade" value={busca} onChangeText={setBusca} />
        </View>

        {/* ------------------------------------------------------- destinos */}
        <View>
          <CabecalhoSecao titulo="Destinos" />
          {cidadesConsulta.isLoading ? (
            <View style={{ flexDirection: 'row', gap: espaco.md }} aria-busy>
              <Esqueleto altura={180} largura={220} arredondado={raio.lg} />
              <Esqueleto altura={180} largura={220} arredondado={raio.lg} />
            </View>
          ) : cidadesConsulta.error ? (
            <ErroAoCarregar
              erro={cidadesConsulta.error}
              titulo="Não foi possível carregar as cidades"
              onTentarDeNovo={() => void cidadesConsulta.refetch()}
            />
          ) : cidadesVisiveis.length === 0 ? (
            <Texto variante="pequeno" cor={cores.textoSuave}>
              Nenhuma cidade atendida com esse nome.
            </Texto>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: espaco.md, paddingRight: espaco.lg }}>
              {cidadesVisiveis.map((cidade) => (
                <Pressable
                  key={cidade.id}
                  onPress={() =>
                    router.push({ pathname: '/nova-rota', params: { cidadeId: cidade.id } })
                  }
                  role="button"
                  aria-label={`Nova rota em ${cidade.nome}`}
                  style={estilos.cardDestino}>
                  <FotoDoLugar
                    uri={capaCidade[cidade.id]?.url}
                    style={estilos.imagemDestino}
                    tamanhoIcone={32}
                  />
                  <View style={estilos.sombraTexto} />
                  <View style={estilos.infoDestino}>
                    <Texto variante="destaque" peso="forte" cor={cores.textoSobreImagem}>
                      {cidade.bandeira} {cidade.nome}
                    </Texto>
                    <Texto variante="micro" cor={cores.textoSobreImagem}>
                      {cidade.uf} · {cidade.pais}
                    </Texto>
                    {capaCidade[cidade.id] ? (
                      <Texto
                        variante="micro"
                        cor={cores.textoSobreImagem}
                        numberOfLines={1}
                        style={{ opacity: 0.8, fontSize: 9 }}>
                        {capaCidade[cidade.id]!.credito}
                      </Texto>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ------------------------------------------------------- recentes */}
        <View>
          <CabecalhoSecao
            titulo="Recentes"
            acao={historico?.length ? 'Ver tudo' : undefined}
            onPressAcao={() => router.push('/historico')}
          />
          {historicoConsulta.isLoading ? (
            <View style={{ gap: espaco.sm }} aria-busy>
              <Esqueleto altura={72} arredondado={raio.lg} />
              <Esqueleto altura={72} arredondado={raio.lg} />
            </View>
          ) : historicoConsulta.error ? (
            // Antes, uma falha de rede aparecia como "Nenhuma rota ainda".
            <ErroAoCarregar
              erro={historicoConsulta.error}
              titulo="Não foi possível carregar seus roteiros"
              onTentarDeNovo={() => void historicoConsulta.refetch()}
            />
          ) : historico?.length ? (
            <View style={{ gap: espaco.sm }}>
              {historico.slice(0, 3).map((item) => (
                <CartaoDoRoteiro
                  key={item.id}
                  resumo={item}
                  onAbrir={() => router.push(`/roteiro/${item.id}`)}
                />
              ))}
            </View>
          ) : (
            <EstadoVazio
              icone="navigate-outline"
              titulo="Nenhuma rota ainda"
              descricao="Toque em Nova rota e informe quanto tempo você tem hoje. O limite de gasto é opcional."
            />
          )}
        </View>
      </ScrollView>

      {/* --------------------------------------------------- ação flutuante */}
      <View style={estilos.rodape}>
        <Botao
          titulo="Nova rota"
          icone="add"
          variante="secundario"
          onPress={() => router.push('/nova-rota')}
        />
      </View>
    </SafeAreaView>
  );
}

function useEstilos(cores: Paleta) {
  return useMemo(
    () =>
      StyleSheet.create({
        topo: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        marca: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
        logo: {
          width: 34,
          height: 34,
          borderRadius: raio.md,
          backgroundColor: cores.primaria,
          alignItems: 'center',
          justifyContent: 'center',
        },
        botaoRedondo: {
          width: 38,
          height: 38,
          borderRadius: raio.pilula,
          backgroundColor: cores.fundoAlt,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: cores.borda,
        },
        cardDestino: {
          width: 220,
          height: 180,
          borderRadius: raio.lg,
          overflow: 'hidden',
          backgroundColor: cores.fundoAlt,
          ...sombra.cartao,
        },
        imagemDestino: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
        /** Faixa escura no rodapé da foto para o texto branco ter contraste. */
        sombraTexto: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 90,
          backgroundColor: 'rgba(0,0,0,0.45)',
        },
        infoDestino: {
          position: 'absolute',
          left: espaco.md,
          right: espaco.md,
          bottom: espaco.md,
          gap: 2,
        },
        rodape: {
          position: 'absolute',
          left: espaco.lg,
          right: espaco.lg,
          bottom: espaco.lg,
        },
      }),
    [cores],
  );
}
