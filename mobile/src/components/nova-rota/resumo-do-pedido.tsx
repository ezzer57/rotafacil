/** Resumo do que vai ser pedido ao algoritmo, antes de gerar o roteiro. */

import { Cartao, Texto } from '@/components/ui';
import { formatarDuracao, formatarReais } from '@/domain/format';
import { ehOutroDia } from '@/domain/inicio';
import type { ModoPartida } from '@/domain/partida';
import { useCores } from '@/theme/provider';
import { espaco } from '@/theme/tokens';

interface Props {
  nomeCidade: string | undefined;
  teto: number | null;
  tempoMin: number;
  inicio: Date;
  modo: ModoPartida;
}

const PARTINDO: Record<Exclude<ModoPartida, 'centro'>, string> = {
  gps: 'da sua posição atual',
  manual: 'do ponto que você marcou no mapa',
};

export function ResumoDoPedido({ nomeCidade, teto, tempoMin, inicio, modo }: Props) {
  const cores = useCores();
  const hora = inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <Cartao style={{ backgroundColor: cores.primariaSuave, borderColor: cores.primariaSuave }}>
      <Texto variante="pequeno" peso="semi" cor={cores.primaria}>
        Resumo do pedido
      </Texto>
      <Texto variante="corpo" style={{ marginTop: espaco.xs }}>
        {nomeCidade ?? '-'} · {teto == null ? 'sem limite de gasto' : `até ${formatarReais(teto)}`}{' '}
        em {formatarDuracao(tempoMin)}, a partir das {hora}
        {ehOutroDia(inicio) ? ' de amanhã' : ''}
      </Texto>
      <Texto variante="micro" cor={cores.textoSuave} style={{ marginTop: 2 }}>
        Partindo {modo === 'centro' ? `do centro de ${nomeCidade ?? '-'}` : PARTINDO[modo]}
      </Texto>
    </Cartao>
  );
}
