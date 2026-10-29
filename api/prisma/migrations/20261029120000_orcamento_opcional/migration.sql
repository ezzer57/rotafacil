-- O teto de gasto passa a ser opcional: null significa "sem limite".
-- AlterTable
ALTER TABLE "roteiro" ALTER COLUMN "orcamento" DROP NOT NULL;
