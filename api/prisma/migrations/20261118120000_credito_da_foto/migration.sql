-- Crédito (autor e licença) e página de origem da foto de cada ponto.
ALTER TABLE "ponto_interesse"
  ADD COLUMN "fotoCredito" VARCHAR(300),
  ADD COLUMN "fotoFonte" VARCHAR(500);
