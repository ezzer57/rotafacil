/**
 * "Começando quando?": agora ou uma hora do dia. Hora que já passou hoje vale
 * para amanhã, e o chip diz isso. Na bandeira 2 (noite e domingo), um aviso
 * explica o que muda.
 */

import { Cartao, Chip, GrupoDeOpcoes, Texto } from '@/components/ui';
import { HORARIOS_DE_INICIO, ehOutroDia, emBandeira2, inicioPrevisto } from '@/domain/inicio';
import { useCores } from '@/theme/provider';
import { espaco } from '@/theme/tokens';
import { Secao } from './secao';

interface Props {
  /** Hora escolhida; null é "agora". */
  hora: number | null;
  onEscolher: (hora: number | null) => void;
  /** O relógio de referência (o teste passa um fixo). */
  agora?: Date;
}

export function EscolhaDoHorario({ hora, onEscolher, agora = new Date() }: Props) {
  const cores = useCores();
  const inicio = inicioPrevisto(hora, agora);

  return (
    <Secao titulo="Começando quando?">
      <GrupoDeOpcoes rotulo="Horário de início">
        {HORARIOS_DE_INICIO.map((opcao) => {
          const amanha = ehOutroDia(inicioPrevisto(opcao.hora, agora), agora);
          return (
            <Chip
              key={opcao.rotulo}
              rotulo={amanha ? `Amanhã, ${opcao.rotulo}` : opcao.rotulo}
              ativo={hora === opcao.hora}
              onPress={() => onEscolher(opcao.hora)}
            />
          );
        })}
      </GrupoDeOpcoes>
      {emBandeira2(inicio) ? (
        <Cartao
          padding={espaco.md}
          style={{ backgroundColor: cores.alertaSuave, borderColor: cores.alertaSuave }}>
          <Texto variante="micro" peso="semi" cor={cores.alerta}>
            Horário de bandeira 2
          </Texto>
          <Texto variante="micro" cor={cores.textoSuave} style={{ marginTop: 2 }}>
            A tarifa por quilômetro é maior, e lugares fechados nesse horário aparecem marcados no
            roteiro.
          </Texto>
        </Cartao>
      ) : null}
    </Secao>
  );
}
