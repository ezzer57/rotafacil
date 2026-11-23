-- Revisão do modelo (etapa 4 da revisão de código).

-- Se a parada foi visitada já está na tabela de visitas, gravada junto com a
-- marcação que esta coluna repetia.
ALTER TABLE "roteiro_item" DROP COLUMN "visitado";

-- O índice único (roteiroId, ordem) já atende às buscas pelas paradas de um
-- roteiro.
DROP INDEX "roteiro_item_roteiroId_idx";

-- Nenhuma consulta filtra pontos por categoria; a busca de candidatos é por
-- cidade, só os ativos, os mais relevantes primeiro.
DROP INDEX "ponto_interesse_cidadeId_categoria_idx";
CREATE INDEX "ponto_interesse_cidadeId_ativo_relevancia_idx" ON "ponto_interesse"("cidadeId", "ativo", "relevancia");
