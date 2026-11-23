/**
 * Abre o aplicativo inteiro nos testes de fluxo: as rotas de verdade
 * (src/app), os provedores, a guarda de rota e o modo de demonstração, sem
 * servidor. Cada arquivo de fluxo começa do zero, porque o Jest isola os
 * módulos por arquivo (e o modo de demonstração guarda tudo em memória).
 *
 * Importe este arquivo antes de qualquer outro do app: ele troca o que só
 * existe no aparelho.
 */

import { screen, userEvent } from '@testing-library/react-native';
// Também prepara o Jest para o roteador (gestos, animações e links).
import { renderRouter } from 'expo-router/testing-library';

// Os fluxos rodam no modo de demonstração mesmo que o ambiente aponte para a
// API (o provedor lê a variável quando é carregado, depois deste arquivo).
process.env.EXPO_PUBLIC_API_URL = '';

// O mapa é um WebView, que só existe no aparelho.
jest.mock('react-native-webview', () => ({ WebView: () => null }));

// Sem GPS no teste: a permissão é negada e o roteiro parte do centro da
// cidade, a mesma saída que o app oferece a quem não libera a localização.
jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  hasServicesEnabledAsync: jest.fn(async () => true),
  requestForegroundPermissionsAsync: jest.fn(async () => ({
    granted: false,
    canAskAgain: true,
    status: 'denied',
  })),
}));

/** O modo de demonstração responde com atraso, como um servidor de verdade. */
export const ESPERA = { timeout: 5000 };

/** A senha única do modo de demonstração, que a tela de login mostra. */
export const SENHA_DE_DEMONSTRACAO = '12345678';

export type Usuario = ReturnType<typeof userEvent.setup>;

export function abrirApp() {
  // Relativo à pasta mobile, de onde o Jest roda (a configuração dele está lá).
  return renderRouter('./src/app', { initialUrl: '/' });
}

/**
 * Da tela de boas-vindas até o Início, com a conta de demonstração. O modo de
 * demonstração tira o nome do e-mail: ana@exemplo.com é "Ana".
 */
export async function entrar(usuario: Usuario) {
  await usuario.press(await screen.findByRole('button', { name: 'Já tenho conta' }, ESPERA));
  await usuario.type(screen.getByPlaceholderText('E-mail'), 'ana@exemplo.com');
  await usuario.type(screen.getByPlaceholderText('Senha'), SENHA_DE_DEMONSTRACAO);
  await usuario.press(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByText('Olá, Ana', undefined, ESPERA);
}
