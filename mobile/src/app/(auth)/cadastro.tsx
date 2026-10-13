/**
 * Cadastro (UI-03).
 *
 * Mesma divisão do login: o Zod cuida do formato e da confirmação de senha;
 * a unicidade do e-mail só o servidor pode garantir, por isso a mensagem de
 * "e-mail já cadastrado" vem do serviço, não da validação local.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao, Cartao, Campo, Texto } from '@/components/ui';
import { errosPorCampo, schemaCadastro } from '@/domain/validacao';
import { useRegistrar } from '@/hooks/use-rotafacil';
import { useCores } from '@/theme/provider';
import { espaco } from '@/theme/tokens';

export default function TelaCadastro() {
  const router = useRouter();
  const cores = useCores();
  const registrar = useRegistrar();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});

  async function aoRegistrar() {
    const resultado = schemaCadastro.safeParse({ nome, email, senha, confirmacao });
    if (!resultado.success) {
      setErros(errosPorCampo(resultado.error));
      return;
    }
    setErros({});
    try {
      await registrar.mutateAsync(resultado.data);
      router.replace('/');
    } catch {
      // Mensagem do servidor exibida abaixo do formulário.
    }
  }

  const campos = [
    { chave: 'nome', rotulo: 'Nome', valor: nome, set: setNome, icone: 'person-outline' as const },
    {
      chave: 'email',
      rotulo: 'E-mail',
      valor: email,
      set: setEmail,
      icone: 'mail-outline' as const,
    },
    {
      chave: 'senha',
      rotulo: 'Senha',
      valor: senha,
      set: setSenha,
      icone: 'lock-closed-outline' as const,
      secreto: true,
    },
    {
      chave: 'confirmacao',
      rotulo: 'Confirmar senha',
      valor: confirmacao,
      set: setConfirmacao,
      icone: 'lock-closed-outline' as const,
      secreto: true,
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: espaco.xl, gap: espaco.xl }}
          keyboardShouldPersistTaps="handled">
          <View style={{ gap: espaco.sm, marginTop: espaco.lg }}>
            <Texto variante="display" peso="forte">
              Criar conta
            </Texto>
            <Texto variante="pequeno" cor={cores.textoSuave}>
              Leva menos de um minuto.
            </Texto>
          </View>

          <View style={{ gap: espaco.md }}>
            {campos.map((campo) => (
              <View key={campo.chave} style={{ gap: espaco.xs }}>
                <Campo
                  rotulo={campo.rotulo}
                  icone={campo.icone}
                  value={campo.valor}
                  onChangeText={campo.set}
                  secureTextEntry={campo.secreto}
                  autoCapitalize={campo.chave === 'nome' ? 'words' : 'none'}
                  keyboardType={campo.chave === 'email' ? 'email-address' : 'default'}
                />
                {erros[campo.chave] ? (
                  <Texto variante="micro" cor={cores.erro}>
                    {erros[campo.chave]}
                  </Texto>
                ) : null}
              </View>
            ))}

            {registrar.isError ? (
              <Cartao
                padding={espaco.md}
                style={{ backgroundColor: cores.erroSuave, borderColor: cores.erroSuave }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.sm }}>
                  <Ionicons name="alert-circle" size={16} color={cores.erro} />
                  <Texto variante="pequeno" cor={cores.erro}>
                    {(registrar.error as Error).message}
                  </Texto>
                </View>
              </Cartao>
            ) : null}

            <Botao
              titulo="Cadastrar"
              carregando={registrar.isPending}
              onPress={aoRegistrar}
              style={{ marginTop: espaco.sm }}
            />
            <Botao titulo="Já tenho conta" variante="texto" onPress={() => router.back()} />
          </View>

          {/* Transparência exigida pela LGPD, art. 9º. */}
          <Texto variante="micro" cor={cores.textoSuave} style={{ textAlign: 'center' }}>
            Ao criar a conta você concorda com o uso da sua localização apenas para gerar
            roteiros, conforme a Política de Privacidade.
          </Texto>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
