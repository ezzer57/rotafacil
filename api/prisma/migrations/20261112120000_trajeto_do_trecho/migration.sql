-- Origem da medida e traçado de cada trecho do roteiro.
ALTER TABLE "roteiro_item"
  ADD COLUMN "fonteRota" VARCHAR(10),
  ADD COLUMN "trajeto" JSONB;
