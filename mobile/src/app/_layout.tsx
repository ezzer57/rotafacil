import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { ProvedorDeServicos } from '@/data/provider';
import { useUsuario } from '@/hooks/use-rotafacil';
import { ProvedorDeTema, useTema } from '@/theme/provider';

SplashScreen.hideAsync();

export default function LayoutRaiz() {
  return (
    <ProvedorDeTema>
      <ProvedorDeServicos>
        <Navegacao />
      </ProvedorDeServicos>
    </ProvedorDeTema>
  );
}

/** Componente separado porque precisa ler tema e sessao de dentro dos provedores. */
function Navegacao() {
  const { cores, escuro } = useTema();
  useProtecaoDeRota();

  return (
    <>
      <StatusBar style={escuro ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: cores.fundo },
          headerTitleStyle: { color: cores.texto, fontWeight: '600' },
          headerTintColor: cores.texto,
          contentStyle: { backgroundColor: cores.fundo },
        }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="nova-rota" options={{ title: 'Nova rota', presentation: 'modal' }} />
        <Stack.Screen name="roteiro/[id]" options={{ title: 'Seu roteiro' }} />
      </Stack>
    </>
  );
}

/**
 * Guarda de rota: mantem quem nao esta autenticado dentro do grupo (auth) e
 * tira de la quem ja entrou. Esta e a protecao de navegacao, nao a de dados -
 * essa fica no servidor, que exige o token em cada requisicao.
 */
function useProtecaoDeRota() {
  const { data: usuario, isLoading } = useUsuario();
  const segmentos = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const emTelaDeAutenticacao = segmentos[0] === '(auth)';

    if (!usuario && !emTelaDeAutenticacao) {
      router.replace('/login');
    } else if (usuario && emTelaDeAutenticacao) {
      router.replace('/');
    }
  }, [usuario, isLoading, segmentos, router]);
}
