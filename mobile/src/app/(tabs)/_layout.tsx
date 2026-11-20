import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCores } from '@/theme/provider';

export default function LayoutAbas() {
  const cores = useCores();
  // Espaço da barra de gestos (Android) e do indicador de início (iPhone).
  // Com altura fixa, os rótulos das abas ficavam embaixo deles.
  const { bottom } = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.primaria,
        tabBarInactiveTintColor: cores.textoSuave,
        tabBarStyle: {
          backgroundColor: cores.superficie,
          borderTopColor: cores.borda,
          height: 56 + bottom,
          paddingBottom: Math.max(bottom, 8),
          paddingTop: 6,
        },
        // Com o teclado aberto, a barra de abas some e não empurra o campo.
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: cores.fundo },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="historico"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
