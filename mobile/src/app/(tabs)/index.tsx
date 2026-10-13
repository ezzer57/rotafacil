/**
 * Tela inicial (UI-04).
 *
 * Estrutura inspirada no Figma: saudação, busca, destinos e viagens recentes,
 * com o botao flutuante de nova rota. O icone de sol/lua alterna o tema.
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Botao,
  CabecalhoSecao,
  Cartao,
  Campo,
  Esqueleto,
  EstadoVazio,
  Selo,
  Texto,
} from '@/components/ui';
import { formatarDataCurta, formatarReais } from '@/domain/format';
import { useCidades, useHistorico, useUsuario } from '@/hooks/use-rotafacil';
import { useTema } from '@/theme/provider';
import { espaco, raio, sombra, type Paleta } from '@/theme/tokens';

const capaCidade: Record<string, string> = {
  quixada: 'https://picsum.photos/seed/quixada-cidade/800/600',
  fortaleza: 'https://picsum.photos/seed/fortaleza-cidade/800/600',
};

export default function TelaInicio() {
  const router = useRouter();
  const { cores, escuro, alternar } = useTema();
  const estilos = useEstilos(cores);
  const [busca, setBusca] = useState('');
  const { data: usuario } = useUsuario();
  const { data: cidades, isLoading: carregandoCidades } = useCidades();
  const { data: historico, isLoading: carregandoHistorico } = useHistorico();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: espaco.lg, paddingBottom: 120, gap: espaco.xl }}
        showsVerticalScrollIndicator={false}>
        {/* ----------------------------------------------------- cabeçalho */}
        <View style={estilos.topo}>
          <View style={estilos.marca}>
            <View style={estilos.logo}>
              <Ionicons name="navigate" size={18} color="#FFFFFF" />
            </View>
            <Texto variante="destaque" peso="forte">
              RotaFacil
            </Texto>
          </View>

          <View style={{ flexDirection: 'row', gap: espaco.sm }}>
            <Pressable style={estilos.botaoRedondo} onPress={alternar}>
              <Ionicons
                name={escuro ? 'sunny' : 'moon'}
                size={18}
                color={escuro ? cores.alerta : cores.textoSuave}
              />
            </Pressable>
            <Pressable style={estilos.botaoRedondo} onPress={() => router.push('/perfil')}>
              <Ionicons name="person" size={18} color={cores.textoSuave} />
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
          <Campo
            icone="search"
            placeholder="Ache novos lugares"
            value={busca}
            onChangeText={setBusca}
          />
        </View>

        {/* ------------------------------------------------------- destinos */}
        <View>
          <CabecalhoSecao titulo="Destinos" />
          {carregandoCidades ? (
            <View style={{ flexDirection: 'row', gap: espaco.md }}>
              <Esqueleto altura={180} largura={220} arredondado={raio.lg} />
              <Esqueleto altura={180} largura={220} arredondado={raio.lg} />
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: espaco.md, paddingRight: espaco.lg }}>
              {(cidades ?? [])
                .filter((c) => c.nome.toLowerCase().includes(busca.trim().toLowerCase()))
                .map((cidade) => (
                  <Pressable
                    key={cidade.id}
                    onPress={() =>
                      router.push({ pathname: '/nova-rota', params: { cidadeId: cidade.id } })
                    }
                    style={estilos.cardDestino}>
                    <Image
                      source={{ uri: capaCidade[cidade.id] }}
                      style={estilos.imagemDestino}
                      contentFit="cover"
                      transition={200}
                    />
                    <View style={estilos.sombraTexto} />
                    <View style={estilos.infoDestino}>
                      <Texto variante="destaque" peso="forte" cor={cores.textoSobreImagem}>
                        {cidade.bandeira} {cidade.nome}
                      </Texto>
                      <Texto variante="micro" cor={cores.textoSobreImagem}>
                        {cidade.uf} · {cidade.pais}
                      </Texto>
                    </View>
                    {cidade.tarifaCalibrada ? (
                      <View style={estilos.seloDestino}>
                        <Selo
                          texto="Tarifa calibrada"
                          icone="checkmark-circle"
                          cor={cores.sucesso}
                          fundo={cores.sucessoSuave}
                        />
                      </View>
                    ) : null}
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
          {carregandoHistorico ? (
            <View style={{ gap: espaco.sm }}>
              <Esqueleto altura={72} arredondado={raio.lg} />
              <Esqueleto altura={72} arredondado={raio.lg} />
            </View>
          ) : historico?.length ? (
            <View style={{ gap: espaco.sm }}>
              {historico.slice(0, 3).map((item) => (
                <Cartao
                  key={item.id}
                  padding={espaco.md}
                  onPress={() => router.push(`/roteiro/${item.id}`)}>
                  <View style={estilos.linhaRecente}>
                    <Image
                      source={{ uri: item.capaUrl ?? undefined }}
                      style={estilos.miniatura}
                      contentFit="cover"
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Texto variante="corpo" peso="semi">
                        {item.cidadeNome}
                      </Texto>
                      <Texto variante="pequeno" cor={cores.textoSuave}>
                        {item.totalPontos} paradas · {formatarDataCurta(item.criadoEm)}
                      </Texto>
                    </View>
                    <Texto variante="pequeno" peso="semi" cor={cores.primaria}>
                      {formatarReais(item.custoEstimado)}
                    </Texto>
                  </View>
                </Cartao>
              ))}
            </View>
          ) : (
            <EstadoVazio
              icone="navigate-outline"
              titulo="Nenhuma rota ainda"
              descricao="Toque em Nova rota e informe quanto tempo e quanto dinheiro você tem hoje."
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
        seloDestino: { position: 'absolute', top: espaco.md, left: espaco.md },
        linhaRecente: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
        miniatura: {
          width: 48,
          height: 48,
          borderRadius: raio.md,
          backgroundColor: cores.fundoAlt,
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
