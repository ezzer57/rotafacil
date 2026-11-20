/**
 * Política de Privacidade (LGPD, arts. 6º e 9º).
 *
 * Abre antes do cadastro e também depois do login, por isso fica fora dos
 * grupos (auth) e (tabs) e é liberada no guarda de rota.
 */

import { ScrollView, View } from 'react-native';

import { Cartao, Texto } from '@/components/ui';
import { POLITICA_PRIVACIDADE, SECOES_POLITICA } from '@/domain/privacidade';
import { useCores } from '@/theme/provider';
import { espaco } from '@/theme/tokens';

export default function TelaPrivacidade() {
  const cores = useCores();

  return (
    <ScrollView contentContainerStyle={{ padding: espaco.lg, gap: espaco.lg, paddingBottom: 60 }}>
      <Texto variante="micro" cor={cores.textoSuave}>
        Versão {POLITICA_PRIVACIDADE.versao}, de {POLITICA_PRIVACIDADE.vigencia}.
      </Texto>

      {SECOES_POLITICA.map((secao) => (
        <Cartao key={secao.titulo}>
          <Texto variante="pequeno" peso="semi">
            {secao.titulo}
          </Texto>
          <View style={{ gap: espaco.sm, marginTop: espaco.sm }}>
            {secao.itens.map((item) => (
              <Texto key={item} variante="pequeno" cor={cores.textoSuave}>
                {item}
              </Texto>
            ))}
          </View>
        </Cartao>
      ))}
    </ScrollView>
  );
}
