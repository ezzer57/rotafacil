/**
 * Mapa do ponto de partida, com as opções "Minha posição" e "Centro da
 * cidade" e o aviso quando o ponto fica longe demais da cidade.
 */

import MapaPartida from '@/components/mapa/partida';
import { useAlturaDoMapa } from '@/components/mapa/altura';
import { Chip, GrupoDeOpcoes, Texto } from '@/components/ui';
import { RAIO_COBERTURA_CIDADE_KM } from '@/domain/geo';
import type { Partida } from '@/domain/partida';
import type { Coordenada } from '@/domain/types';
import type { Localizacao } from '@/hooks/use-localizacao';
import { useCores } from '@/theme/provider';

interface Props {
  partida: Partida;
  localizacao: Localizacao;
  onTocarNoMapa: (ponto: Coordenada) => void;
  onUsarGps: () => void;
  onUsarCentro: () => void;
}

export function EscolhaDaPartida({
  partida,
  localizacao,
  onTocarNoMapa,
  onUsarGps,
  onUsarCentro,
}: Props) {
  const cores = useCores();
  // Alto o bastante para mexer no mapa sem empurrar o formulário para longe.
  const alturaMapa = useAlturaDoMapa(0.42, 260, 420);
  const { origem, cidade, modo, gpsNaCidade, longeDemais } = partida;
  if (!origem) return null;

  return (
    <>
      <MapaPartida
        posicao={gpsNaCidade ? localizacao.coordenada : null}
        precisaoM={gpsNaCidade ? localizacao.precisaoM : null}
        partida={origem}
        altura={alturaMapa}
        onEscolher={onTocarNoMapa}
      />
      <Texto variante="micro" cor={cores.textoSuave}>
        Toque no mapa para ajustar o ponto de partida. O ponto com borda verde é de onde o roteiro
        sai.
      </Texto>
      <GrupoDeOpcoes rotulo="Ponto de partida">
        {gpsNaCidade ? (
          <Chip
            rotulo="Minha posição"
            icone="navigate"
            ativo={modo === 'gps'}
            onPress={onUsarGps}
          />
        ) : null}
        <Chip
          rotulo={`Centro de ${cidade?.nome ?? 'cidade'}`}
          icone="business"
          ativo={modo === 'centro'}
          onPress={onUsarCentro}
        />
        {modo === 'manual' ? <Chip rotulo="Ponto no mapa" icone="pin" ativo /> : null}
      </GrupoDeOpcoes>
      {longeDemais ? (
        <Texto variante="micro" cor={cores.erro}>
          Esse ponto fica a mais de {RAIO_COBERTURA_CIDADE_KM} km do centro de {cidade?.nome}.
          Escolha um ponto mais perto ou parta do centro.
        </Texto>
      ) : null}
    </>
  );
}
