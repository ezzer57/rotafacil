import { Stack } from 'expo-router';

/** As telas de entrada ocupam a tela inteira, sem cabecalho de navegacao. */
export default function LayoutAutenticacao() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
