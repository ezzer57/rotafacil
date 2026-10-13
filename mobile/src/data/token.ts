/**
 * Guarda do token de sessao (JWT).
 *
 * No aparelho usa o SecureStore, que grava em area protegida do sistema
 * (Keychain no iOS, Keystore no Android) - e onde um token deve ficar, nunca
 * no AsyncStorage. Na versao web o SecureStore nao existe, entao cai para o
 * armazenamento comum, usado apenas em desenvolvimento.
 *
 * Hoje nada escreve aqui, porque a autenticacao esta simulada. Quando a API
 * entrar, o fluxo passa a ser: entrar() -> salvarToken() -> o cliente HTTP
 * le o token em cada requisicao.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHAVE = 'rotafacil_token';

const naWeb = Platform.OS === 'web';

export async function salvarToken(token: string): Promise<void> {
  if (naWeb) return AsyncStorage.setItem(CHAVE, token);
  return SecureStore.setItemAsync(CHAVE, token);
}

export async function lerToken(): Promise<string | null> {
  if (naWeb) return AsyncStorage.getItem(CHAVE);
  return SecureStore.getItemAsync(CHAVE);
}

export async function limparToken(): Promise<void> {
  if (naWeb) return AsyncStorage.removeItem(CHAVE);
  return SecureStore.deleteItemAsync(CHAVE);
}
