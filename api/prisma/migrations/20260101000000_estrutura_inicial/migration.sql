-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CategoriaPOI" AS ENUM ('cultura', 'natureza', 'gastronomia', 'compras', 'vidaNoturna', 'religioso');

-- CreateEnum
CREATE TYPE "Modal" AS ENUM ('pe', 'app');

-- CreateEnum
CREATE TYPE "MotivoDescarte" AS ENUM ('orcamento', 'tempo', 'horario');

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "email" VARCHAR(180) NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alteradoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consentimento" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "tipo" VARCHAR(60) NOT NULL,
    "versao" VARCHAR(20) NOT NULL,
    "aceitoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consentimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cidade" (
    "id" VARCHAR(60) NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "pais" VARCHAR(60) NOT NULL,
    "bandeira" VARCHAR(8) NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarifa_taxi" (
    "id" UUID NOT NULL,
    "cidadeId" VARCHAR(60) NOT NULL,
    "bandeirada" DECIMAL(10,2) NOT NULL,
    "kmBandeira1" DECIMAL(10,2) NOT NULL,
    "kmBandeira2" DECIMAL(10,2) NOT NULL,
    "horaParada" DECIMAL(10,2) NOT NULL,
    "alfa" DECIMAL(5,3) NOT NULL,
    "alfaP10" DECIMAL(5,3) NOT NULL,
    "alfaP90" DECIMAL(5,3) NOT NULL,
    "norma" VARCHAR(240) NOT NULL,
    "vigenciaInicio" TIMESTAMP(3) NOT NULL,
    "vigenciaFim" TIMESTAMP(3),

    CONSTRAINT "tarifa_taxi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ponto_interesse" (
    "id" VARCHAR(120) NOT NULL,
    "cidadeId" VARCHAR(60) NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "categoria" "CategoriaPOI" NOT NULL,
    "endereco" VARCHAR(240) NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "nota" DOUBLE PRECISION,
    "avaliacoes" INTEGER NOT NULL DEFAULT 0,
    "faixaPreco" INTEGER,
    "fotoUrl" VARCHAR(500),
    "tempoVisitaMin" INTEGER NOT NULL,
    "abreMin" INTEGER,
    "fechaMin" INTEGER,
    "sincronizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ponto_interesse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roteiro" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "cidadeId" VARCHAR(60) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inicioPrevisto" TIMESTAMP(3) NOT NULL,
    "orcamento" DECIMAL(10,2) NOT NULL,
    "tempoDisponivelMin" INTEGER NOT NULL,
    "origemLat" DOUBLE PRECISION NOT NULL,
    "origemLng" DOUBLE PRECISION NOT NULL,
    "categorias" "CategoriaPOI"[],
    "pontosExcluidos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "custoTransporteMin" DECIMAL(10,2) NOT NULL,
    "custoTransporteEst" DECIMAL(10,2) NOT NULL,
    "custoTransporteMax" DECIMAL(10,2) NOT NULL,
    "custoLocais" DECIMAL(10,2) NOT NULL,
    "duracaoMin" INTEGER NOT NULL,
    "distanciaKm" DOUBLE PRECISION NOT NULL,
    "trechosAPe" INTEGER NOT NULL DEFAULT 0,
    "economiaCaminhando" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "diagnostico" JSONB NOT NULL,

    CONSTRAINT "roteiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roteiro_item" (
    "id" UUID NOT NULL,
    "roteiroId" UUID NOT NULL,
    "pontoId" VARCHAR(120) NOT NULL,
    "ordem" INTEGER NOT NULL,
    "chegadaPrevista" TIMESTAMP(3) NOT NULL,
    "saidaPrevista" TIMESTAMP(3) NOT NULL,
    "custoNoLocal" DECIMAL(10,2) NOT NULL,
    "visitado" BOOLEAN NOT NULL DEFAULT false,
    "modal" "Modal",
    "distanciaKm" DOUBLE PRECISION,
    "duracaoMin" INTEGER,
    "bandeira" INTEGER,
    "custoMin" DECIMAL(10,2),
    "custoEst" DECIMAL(10,2),
    "custoMax" DECIMAL(10,2),
    "calculo" JSONB,

    CONSTRAINT "roteiro_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roteiro_descartado" (
    "id" UUID NOT NULL,
    "roteiroId" UUID NOT NULL,
    "pontoId" VARCHAR(120) NOT NULL,
    "motivo" "MotivoDescarte" NOT NULL,
    "detalhe" VARCHAR(200) NOT NULL,

    CONSTRAINT "roteiro_descartado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visita" (
    "id" UUID NOT NULL,
    "roteiroId" UUID NOT NULL,
    "pontoId" VARCHAR(120) NOT NULL,
    "chegadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "custoRegistrado" DECIMAL(10,2),

    CONSTRAINT "visita_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "consentimento_usuarioId_tipo_versao_key" ON "consentimento"("usuarioId", "tipo", "versao");

-- CreateIndex
CREATE INDEX "tarifa_taxi_cidadeId_vigenciaInicio_idx" ON "tarifa_taxi"("cidadeId", "vigenciaInicio");

-- CreateIndex
CREATE INDEX "ponto_interesse_cidadeId_categoria_idx" ON "ponto_interesse"("cidadeId", "categoria");

-- CreateIndex
CREATE INDEX "roteiro_usuarioId_criadoEm_idx" ON "roteiro"("usuarioId", "criadoEm");

-- CreateIndex
CREATE INDEX "roteiro_item_roteiroId_idx" ON "roteiro_item"("roteiroId");

-- CreateIndex
CREATE UNIQUE INDEX "roteiro_item_roteiroId_ordem_key" ON "roteiro_item"("roteiroId", "ordem");

-- CreateIndex
CREATE INDEX "roteiro_descartado_roteiroId_idx" ON "roteiro_descartado"("roteiroId");

-- CreateIndex
CREATE UNIQUE INDEX "visita_roteiroId_pontoId_key" ON "visita"("roteiroId", "pontoId");

-- AddForeignKey
ALTER TABLE "consentimento" ADD CONSTRAINT "consentimento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifa_taxi" ADD CONSTRAINT "tarifa_taxi_cidadeId_fkey" FOREIGN KEY ("cidadeId") REFERENCES "cidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ponto_interesse" ADD CONSTRAINT "ponto_interesse_cidadeId_fkey" FOREIGN KEY ("cidadeId") REFERENCES "cidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roteiro" ADD CONSTRAINT "roteiro_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roteiro" ADD CONSTRAINT "roteiro_cidadeId_fkey" FOREIGN KEY ("cidadeId") REFERENCES "cidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roteiro_item" ADD CONSTRAINT "roteiro_item_roteiroId_fkey" FOREIGN KEY ("roteiroId") REFERENCES "roteiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roteiro_item" ADD CONSTRAINT "roteiro_item_pontoId_fkey" FOREIGN KEY ("pontoId") REFERENCES "ponto_interesse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roteiro_descartado" ADD CONSTRAINT "roteiro_descartado_roteiroId_fkey" FOREIGN KEY ("roteiroId") REFERENCES "roteiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita" ADD CONSTRAINT "visita_roteiroId_fkey" FOREIGN KEY ("roteiroId") REFERENCES "roteiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita" ADD CONSTRAINT "visita_pontoId_fkey" FOREIGN KEY ("pontoId") REFERENCES "ponto_interesse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
