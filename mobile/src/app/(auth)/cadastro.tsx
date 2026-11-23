/**
 * Cadastro (UI-03).
 *
 * Mesma divisão do login: o Zod cuida do formato e da confirmação de senha;
 * a unicidade do e-mail só o servidor pode garantir, por isso a mensagem de
 * "e-mail já cadastrado" vem do serviço, não da validação local.
 *
 * O aceite da Política de Privacidade é explícito: a caixa começa desmarcada
 * e o cadastro só sai com ela marcada. O serviço registra o aceite na API,
 * com a versão lida (LGPD, art. 8º).
 */

import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvisoDeErro, Botao, CaixaMarcacao, Campo, Texto } from '@/components/ui';
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
  const [aceitouPolitica, setAceitouPolitica] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  // Para o Enter de cada campo levar ao seguinte.
  const refsDosCampos = useRef<(TextInput | null)[]>([]);

  async function aoRegistrar() {
    // Sem o aceite, o Enter não cadastra, como o botão desligado.
    // E Enter apertado duas vezes não manda dois pedidos.
    if (!aceitouPolitica || registrar.isPending) return;
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: espaco.xl, gap: espaco.xl }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <View style={{ gap: espaco.sm, marginTop: espaco.lg }}>
            <Texto variante="display" peso="forte" accessibilityRole="header">
              Criar conta
            </Texto>
            <Texto variante="pequeno" cor={cores.textoSuave}>
              Leva menos de um minuto.
            </Texto>
          </View>

          <View style={{ gap: espaco.md }}>
            {campos.map((campo, indice) => {
              const ultimo = indice === campos.length - 1;
              return (
                <Campo
                  key={campo.chave}
                  ref={(el) => {
                    refsDosCampos.current[indice] = el;
                  }}
                  rotulo={campo.rotulo}
                  icone={campo.icone}
                  value={campo.valor}
                  onChangeText={campo.set}
                  secureTextEntry={campo.secreto}
                  autoCapitalize={campo.chave === 'nome' ? 'words' : 'none'}
                  keyboardType={campo.chave === 'email' ? 'email-address' : 'default'}
                  erro={erros[campo.chave]}
                  // Enter vai para o campo seguinte; no último, cadastra.
                  returnKeyType={ultimo ? 'go' : 'next'}
                  submitBehavior={ultimo ? 'blurAndSubmit' : 'submit'}
                  onSubmitEditing={() =>
                    ultimo ? aoRegistrar() : refsDosCampos.current[indice + 1]?.focus()
                  }
                />
              );
            })}

            <View style={{ gap: espaco.xs, marginTop: espaco.xs }}>
              <CaixaMarcacao
                marcada={aceitouPolitica}
                onPress={() => setAceitouPolitica((marcada) => !marcada)}>
                <Texto variante="pequeno" cor={cores.textoSuave}>
                  Li e aceito a Política de Privacidade, inclusive o uso da minha localização para
                  montar os roteiros, o envio dela a serviços de rotas fora do Brasil e o uso
                  anônimo dos dados na pesquisa do TCC.
                </Texto>
              </CaixaMarcacao>
              <Botao
                titulo="Ler a Política de Privacidade"
                variante="texto"
                icone="document-text-outline"
                largura="auto"
                onPress={() => router.push('/privacidade')}
                style={{ minHeight: 32, paddingHorizontal: 0, alignSelf: 'flex-start' }}
              />
            </View>

            {registrar.error ? <AvisoDeErro mensagem={registrar.error.message} /> : null}

            <Botao
              titulo="Cadastrar"
              carregando={registrar.isPending}
              desabilitado={!aceitouPolitica}
              onPress={aoRegistrar}
              style={{ marginTop: espaco.sm }}
            />
            <Botao titulo="Já tenho conta" variante="texto" onPress={() => router.back()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
