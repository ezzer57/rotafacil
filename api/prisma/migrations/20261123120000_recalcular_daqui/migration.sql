-- "Recalcular daqui" (objetivo 7 do TCC).
--
-- O roteiro guarda o último recálculo: quando, de onde o resto partiu, com
-- quanto tempo e de que partida. A parada guarda de onde saiu o trecho até
-- ela quando não foi da parada anterior (a posição da pessoa no recálculo).
-- Todas as colunas aceitam nulo: os roteiros já gravados seguem iguais.

-- AlterTable
ALTER TABLE "roteiro" ADD COLUMN     "recalculadoEm" TIMESTAMP(3),
ADD COLUMN     "recalculoDe" VARCHAR(20),
ADD COLUMN     "recalculoLat" DOUBLE PRECISION,
ADD COLUMN     "recalculoLng" DOUBLE PRECISION,
ADD COLUMN     "recalculoTempoMin" INTEGER;

-- AlterTable
ALTER TABLE "roteiro_item" ADD COLUMN     "partidaLat" DOUBLE PRECISION,
ADD COLUMN     "partidaLng" DOUBLE PRECISION;
