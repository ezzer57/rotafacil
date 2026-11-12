#!/usr/bin/env bash
# Prepara um servidor OSRM proprio para o RotaFacil (Quixada e Fortaleza).
#
# Baixa o mapa do Nordeste (Geofabrik, dados do OpenStreetMap, ~450 MB), recorta
# a regiao entre Fortaleza e Quixada e processa uma vez para carro e outra para
# a pe. Precisa so de Docker. Demora alguns minutos na primeira vez e deixa
# tudo em osrm/dados/, que nao vai para o Git.
#
#   bash osrm/preparar.sh          # prepara
#   docker compose -f osrm/docker-compose.yml up -d   # liga os dois servidores
set -euo pipefail

cd "$(dirname "$0")"
mkdir -p dados
# No Git Bash do Windows, impede a conversao de caminhos dentro do container.
export MSYS_NO_PATHCONV=1
DADOS="$(pwd -W 2>/dev/null || pwd)/dados"

OSRM_IMAGEM="ghcr.io/project-osrm/osrm-backend:latest"
BBOX="-39.5,-5.4,-38.3,-3.6"   # oeste,sul,leste,norte

if [ ! -f dados/nordeste.osm.pbf ]; then
  echo "Baixando o mapa do Nordeste (~450 MB)..."
  curl -L --fail -o dados/nordeste.osm.pbf \
    https://download.geofabrik.de/south-america/brazil/nordeste-latest.osm.pbf
fi

if [ ! -f dados/regiao.osm.pbf ]; then
  echo "Recortando a regiao (Fortaleza ate Quixada)..."
  docker run --rm -v "$DADOS:/dados" iboates/osmium:latest \
    extract --bbox "$BBOX" --strategy complete_ways --overwrite \
    -o /dados/regiao.osm.pbf /dados/nordeste.osm.pbf
fi

for perfil in carro:car a-pe:foot; do
  nome="${perfil%%:*}"
  lua="${perfil##*:}"
  if [ -f "dados/$nome.osrm.mldgr" ]; then
    echo "Perfil $nome ja processado."
    continue
  fi
  echo "Processando o perfil $nome ($lua)..."
  cp dados/regiao.osm.pbf "dados/$nome.osm.pbf"
  docker run --rm -v "$DADOS:/dados" "$OSRM_IMAGEM" osrm-extract -p "/opt/$lua.lua" "/dados/$nome.osm.pbf"
  docker run --rm -v "$DADOS:/dados" "$OSRM_IMAGEM" osrm-partition "/dados/$nome.osrm"
  docker run --rm -v "$DADOS:/dados" "$OSRM_IMAGEM" osrm-customize "/dados/$nome.osrm"
  rm -f "dados/$nome.osm.pbf"
done

echo
echo "Pronto. Ligue os servidores com:"
echo "  docker compose -f osrm/docker-compose.yml up -d"
echo "e aponte a API (api/.env) para eles:"
echo "  OSRM_URL_CARRO=http://localhost:5000"
echo "  OSRM_URL_A_PE=http://localhost:5001"
