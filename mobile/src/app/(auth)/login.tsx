/**
 * Login (UI-03).
 *
 * A validação de formato acontece aqui (Zod) apenas para dar resposta
 * imediata. A conferência da credencial é feita pelo serviço de
 * autenticação - hoje simulado, depois a rota POST /v1/sessions da API.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao, Cartao, Campo, Texto } from '@/components/ui';
import { usandoApiReal } from '@/data/provider';
import { errosPorCampo, schemaLogin } from '@/domain/validacao';
import { useEntrar } from '@/hooks/use-rotafacil';
import { useCores } from '@/theme/provider';
import { espaco, raio } from '@/theme/tokens';

export default function TelaLogin() {
  const router = useRouter();
  const cores = useCores();
  const entrar = useEntrar();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  async function aoEntrar() {
    const resultado = schemaLogin.safeParse({ email, senha });
    if (!resultado.success) {
      setErros(errosPorCampo(resultado.error));
      return;
    }
    setErros({});
    try {
      await entrar.mutateAsync(resultado.data);
      router.replace('/');
    } catch {
      // A mensagem vinda do serviço é exibida abaixo do formulário.
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: espaco.xl,
            justifyContent: 'center',
            gap: espaco.xl,
          }}
          keyboardShouldPersistTaps="handled">
          {/* ------------------------------------------------------- marca */}
          <View style={{ alignItems: 'center', gap: espaco.md }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: raio.xl,
                backgroundColor: cores.primaria,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name="navigate" size={30} color="#FFFFFF" />
            </View>
            <Texto variante="display" peso="forte">
              Bem-vindo
            </Texto>
            <Texto variante="pequeno" cor={cores.textoSuave} style={{ textAlign: 'center' }}>
              Entre para montar roteiros que cabem no seu tempo e no seu bolso.
            </Texto>
          </View>

          {/* --------------------------------------------------- formulário */}
          <View style={{ gap: espaco.md }}>
            <View style={{ gap: espaco.xs }}>
              <Campo
                icone="mail-outline"
                placeholder="E-mail"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
              />
              {erros.email ? (
                <Texto variante="micro" cor={cores.erro}>
                  {erros.email}
                </Texto>
              ) : null}
            </View>

            <View style={{ gap: espaco.xs }}>
              <View style={{ justifyContent: 'center' }}>
                <Campo
                  icone="lock-closed-outline"
                  placeholder="Senha"
                  secureTextEntry={!mostrarSenha}
                  autoComplete="password"
                  value={senha}
                  onChangeText={setSenha}
                />
                <Pressable
                  onPress={() => setMostrarSenha((v) => !v)}
                  style={{ position: 'absolute', right: espaco.lg, bottom: 16 }}>
                  <Ionicons
                    name={mostrarSenha ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={cores.textoSuave}
                  />
                </Pressable>
              </View>
              {erros.senha ? (
                <Texto variante="micro" cor={cores.erro}>
                  {erros.senha}
                </Texto>
              ) : null}
            </View>

            {/* Erro devolvido pelo servidor (credencial inválida, rede etc.) */}
            {entrar.isError ? (
              <Cartao
                padding={espaco.md}
                style={{ backgroundColor: cores.erroSuave, borderColor: cores.erroSuave }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.sm }}>
                  <Ionicons name="alert-circle" size={16} color={cores.erro} />
                  <Texto variante="pequeno" cor={cores.erro}>
                    {(entrar.error as Error).message}
                  </Texto>
                </View>
              </Cartao>
            ) : null}

            <Botao
              titulo="Entrar"
              carregando={entrar.isPending}
              onPress={aoEntrar}
              style={{ marginTop: espaco.sm }}
            />
            <Botao
              titulo="Criar uma conta"
              variante="contorno"
              onPress={() => router.push('/cadastro')}
            />
          </View>

          {/* ------------------------------------------------------- social */}
          <View style={{ alignItems: 'center', gap: espaco.md }}>
            <Texto variante="micro" cor={cores.textoSuave}>
              ou entre com
            </Texto>
            <View style={{ flexDirection: 'row', gap: espaco.md }}>
              {(['logo-google', 'logo-facebook', 'logo-apple'] as const).map((icone) => (
                <View
                  key={icone}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: raio.md,
                    borderWidth: 1,
                    borderColor: cores.borda,
                    backgroundColor: cores.fundoAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.5,
                  }}>
                  <Ionicons name={icone} size={22} color={cores.textoSuave} />
                </View>
              ))}
            </View>
            <Texto variante="micro" cor={cores.textoSuave}>
              Login social entra em versão futura (OAuth 2.0)
            </Texto>
          </View>

          {/* A credencial de demonstração só existe nos dados simulados. */}
          {usandoApiReal ? null : (
            <Texto variante="micro" cor={cores.textoSuave} style={{ textAlign: 'center' }}>
              Demonstração: qualquer e-mail válido com a senha 12345678
            </Texto>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
