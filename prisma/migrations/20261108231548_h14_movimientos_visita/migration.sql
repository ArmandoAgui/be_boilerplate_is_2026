-- CreateEnum
CREATE TYPE "Condicion" AS ENUM ('PREAUTORIZADA', 'SIN_AUTORIZACION');

-- CreateTable
CREATE TABLE "MovimientoVisita" (
    "id" UUID NOT NULL,
    "autorizacionId" UUID,
    "unidadId" UUID NOT NULL,
    "visitanteNombre" VARCHAR(100) NOT NULL,
    "visitanteDocumento" VARCHAR(20) NOT NULL,
    "condicion" "Condicion" NOT NULL,
    "ingresoAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salidaAt" TIMESTAMPTZ(3),
    "ingresoPorId" UUID NOT NULL,
    "salidaPorId" UUID,

    CONSTRAINT "MovimientoVisita_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MovimientoVisita_autorizacionId_key" ON "MovimientoVisita"("autorizacionId");

-- CreateIndex
CREATE INDEX "MovimientoVisita_salidaAt_idx" ON "MovimientoVisita"("salidaAt");

-- AddForeignKey
ALTER TABLE "MovimientoVisita" ADD CONSTRAINT "MovimientoVisita_autorizacionId_fkey" FOREIGN KEY ("autorizacionId") REFERENCES "AutorizacionVisita"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoVisita" ADD CONSTRAINT "MovimientoVisita_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoVisita" ADD CONSTRAINT "MovimientoVisita_ingresoPorId_fkey" FOREIGN KEY ("ingresoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoVisita" ADD CONSTRAINT "MovimientoVisita_salidaPorId_fkey" FOREIGN KEY ("salidaPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
