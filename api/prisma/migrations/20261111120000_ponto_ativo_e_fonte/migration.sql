-- Ponto que sai da lista deixa de entrar em roteiro novo ("ativo" = false), e
-- cada ponto passa a guardar o registro de origem dos dados ("fonte").
-- AlterTable
ALTER TABLE "ponto_interesse" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "fonte" VARCHAR(60);
