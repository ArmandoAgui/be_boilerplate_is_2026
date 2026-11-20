-- CreateEnum
CREATE TYPE "EstadoAutorizacion" AS ENUM ('VIGENTE', 'USADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "AutorizacionVisita" (
    "id" UUID NOT NULL,
    "residenteId" UUID NOT NULL,
    "unidadId" UUID NOT NULL,
    "visitanteNombre" VARCHAR(100) NOT NULL,
    "visitanteDocumento" VARCHAR(20) NOT NULL,
    "inicio" TIMESTAMPTZ(3) NOT NULL,
    "fin" TIMESTAMPTZ(3) NOT NULL,
    "estado" "EstadoAutorizacion" NOT NULL DEFAULT 'VIGENTE',
    "canceladaAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutorizacionVisita_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutorizacionVisita_residenteId_estado_inicio_idx" ON "AutorizacionVisita"("residenteId", "estado", "inicio");

-- CreateIndex
CREATE INDEX "AutorizacionVisita_estado_fin_idx" ON "AutorizacionVisita"("estado", "fin");

-- CreateIndex
CREATE INDEX "AutorizacionVisita_visitanteDocumento_idx" ON "AutorizacionVisita"("visitanteDocumento");

-- AddForeignKey
ALTER TABLE "AutorizacionVisita" ADD CONSTRAINT "AutorizacionVisita_residenteId_fkey" FOREIGN KEY ("residenteId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutorizacionVisita" ADD CONSTRAINT "AutorizacionVisita_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
