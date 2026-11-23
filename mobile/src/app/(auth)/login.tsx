/**
 * Login (UI-03).
 *
 * A validação de formato acontece aqui (Zod) apenas para dar resposta
 * imediata. A conferência da credencial é feita pela API (POST
 * /v1/sessions), ou pelo modo de demonstração.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarcaRotaFacil } from '@/components/marca';
import { AvisoDeErro, Botao, Campo, Texto } from '@/components/ui';
import { usandoApiReal } from '@/data/provider';
import { errosPorCampo, schemaLogin } from '@/domain/validacao';
import { useEntrar } from '@/hooks/use-rotafacil';
import { useCores } from '@/theme/provider';
import { espaco } from '@/theme/tokens';

export default function TelaLogin() {
  const router = useRouter();
  const cores = useCores();
  const entrar = useEntrar();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const campoSenha = useRef<TextInput>(null);

  async function aoEntrar() {
    // Enter apertado duas vezes não manda dois pedidos.
    if (entrar.isPending) return;
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: espaco.xl,
            justifyContent: 'center',
            gap: espaco.xl,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          {/* ------------------------------------------------------- marca */}
          <View style={{ alignItems: 'center', gap: espaco.md }}>
            <MarcaRotaFacil tamanho={64} />
            <Texto variante="display" peso="forte" accessibilityRole="header">
              Entrar
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
                erro={erros.email}
                // Enter (ou "próximo" no teclado do celular) vai para a senha.
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => campoSenha.current?.focus()}
              />
            </View>

            <View style={{ gap: espaco.xs }}>
              <View style={{ justifyContent: 'center' }}>
                <Campo
                  ref={campoSenha}
                  icone="lock-closed-outline"
                  placeholder="Senha"
                  secureTextEntry={!mostrarSenha}
                  autoComplete="password"
                  value={senha}
                  onChangeText={setSenha}
                  // Enter na senha entra, como o botão.
                  returnKeyType="go"
                  onSubmitEditing={aoEntrar}
                />
                <Pressable
                  onPress={() => setMostrarSenha((v) => !v)}
                  role="button"
                  aria-label={mostrarSenha ? 'Esconder a senha' : 'Mostrar a senha'}
                  hitSlop={8}
                  style={{ position: 'absolute', right: espaco.lg, bottom: 16 }}>
                  <Ionicons
                    name={mostrarSenha ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={cores.textoSuave}
                    aria-hidden
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
            {entrar.error ? <AvisoDeErro mensagem={entrar.error.message} /> : null}

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
