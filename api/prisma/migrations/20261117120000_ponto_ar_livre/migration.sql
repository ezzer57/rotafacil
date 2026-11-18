-- Lugares ao ar livre (parques, praças, praias, trilhas) nunca ficam fora do horário.
ALTER TABLE "ponto_interesse" ADD COLUMN "arLivre" BOOLEAN NOT NULL DEFAULT false;
