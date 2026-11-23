/**
 * O que a tela do roteiro mostra quando não consegue carregá-lo.
 *
 * "Não encontrado" e "sem conexão" pedem coisas diferentes: no primeiro caso
 * tentar de novo não adianta; no segundo, é exatamente o que resolve.
 */

import { ErroAoCarregar, EstadoVazio } from '@/components/ui';
import { ErroApi } from '@/data/erros';

interface Props {
  erro: unknown;
  onTentarDeNovo: () => void;
  onVoltar: () => void;
}

export function FalhaAoCarregar({ erro, onTentarDeNovo, onVoltar }: Props) {
  const status = erro instanceof ErroApi ? erro.status : undefined;

  if (status === 404) {
    return (
      <EstadoVazio
        icone="alert-circle-outline"
        titulo="Roteiro não encontrado"
        descricao="Ele pode ter sido apagado. Os seus roteiros estão no histórico."
        acao="Voltar ao início"
        onPressAcao={onVoltar}
      />
    );
  }

  return (
    <ErroAoCarregar
      erro={erro}
      titulo="Não foi possível abrir o roteiro"
      onTentarDeNovo={onTentarDeNovo}
    />
  );
}
