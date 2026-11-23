/**
 * "Quer limitar o gasto?": sem limite, valores prontos ou um teto digitado.
 */

import { useRef } from 'react';
import { View } from 'react-native';

import { Campo, Chip, Texto } from '@/components/ui';
import { formatarReais } from '@/domain/format';
import { TETO_MAXIMO, limitarValorEmReais } from '@/domain/limites';
import { lerTeto } from '@/domain/teto';
import { useCores } from '@/theme/provider';
import { Opcoes, Secao } from './secao';

const VALORES_PRONTOS = [30, 50, 80, 150];

interface Props {
  /** O que está no campo; vazio é "sem limite". */
  texto: string;
  onMudar: (texto: string) => void;
  /** Chamado quando o campo ganha foco, para a tela rolar até ele. */
  onFocarCampo: (campo: View | null) => void;
}

export function EscolhaDoTeto({ texto, onMudar, onFocarCampo }: Props) {
  const cores = useCores();
  const campo = useRef<View>(null);
  const { valor, erro, aviso } = lerTeto(texto);

  return (
    <Secao titulo="Quer limitar o gasto?">
      <Opcoes rotulo="Teto de gasto">
        <Chip
          rotulo="Sem limite"
          icone="infinite"
          ativo={texto.trim() === ''}
          onPress={() => onMudar('')}
        />
        {VALORES_PRONTOS.map((pronto) => (
          <Chip
            key={pronto}
            rotulo={formatarReais(pronto)}
            ativo={valor === pronto}
            onPress={() => onMudar(String(pronto))}
          />
        ))}
      </Opcoes>
      <Campo
        refContainer={campo}
        onFocus={() => onFocarCampo(campo.current)}
        icone="wallet"
        rotulo={`Ou defina outro teto (até ${formatarReais(TETO_MAXIMO)})`}
        keyboardType="decimal-pad"
        value={texto}
        // Só números e centavos, e nunca acima do teto máximo.
        onChangeText={(digitado) => onMudar(limitarValorEmReais(digitado, TETO_MAXIMO))}
        maxLength={6}
        placeholder="Sem limite"
        erro={erro ?? undefined}
      />
      {!erro ? (
        <Texto variante="micro" cor={aviso ? cores.alerta : cores.textoSuave}>
          {aviso ??
            (valor == null
              ? 'O roteiro mostra o custo médio previsto. Mesmo sem limite, caminhadas e lugares mais baratos têm preferência.'
              : 'Inclui deslocamento e gastos nos locais. O roteiro é montado para caber nesse valor.')}
        </Texto>
      ) : null}
    </Secao>
  );
}
