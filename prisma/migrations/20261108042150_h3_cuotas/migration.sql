-- CreateEnum
CREATE TYPE "EstadoCuota" AS ENUM ('PENDIENTE', 'PAGADA');

-- CreateTable
CREATE TABLE "Cuota" (
    "id" UUID NOT NULL,
    "unidadId" UUID NOT NULL,
    "concepto" VARCHAR(60) NOT NULL DEFAULT 'Cuota de mantenimiento',
    "periodo" VARCHAR(7) NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "fechaVencimiento" DATE NOT NULL,
    "estado" "EstadoCuota" NOT NULL DEFAULT 'PENDIENTE',
    "fechaPago" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cuota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cuota_unidadId_estado_idx" ON "Cuota"("unidadId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Cuota_unidadId_periodo_concepto_key" ON "Cuota"("unidadId", "periodo", "concepto");

-- AddForeignKey
ALTER TABLE "Cuota" ADD CONSTRAINT "Cuota_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
