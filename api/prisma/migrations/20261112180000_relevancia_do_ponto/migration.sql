-- Relevância de cada ponto, de 1 a 5 (curadoria).
ALTER TABLE "ponto_interesse" ADD COLUMN "relevancia" INTEGER NOT NULL DEFAULT 3;
