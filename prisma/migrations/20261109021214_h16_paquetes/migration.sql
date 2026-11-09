-- CreateSequence
-- Correlativo de los códigos PAQ-NNNNNN. Va a mano porque Prisma solo modela
-- secuencias detrás de autoincrement() sobre enteros, y acá el código es una
-- cadena con prefijo. Postgres garantiza que dos registros simultáneos reciban
-- números distintos. A cambio, una transacción que falla consume su número y
-- deja un hueco: es el precio de no serializar todos los registros con un
-- contador bloqueado, y la tarjeta pide un correlativo, no una numeración
-- sin huecos.
CREATE SEQUENCE "paquete_codigo_seq" AS BIGINT START WITH 1 INCREMENT BY 1;

-- CreateEnum
CREATE TYPE "EstadoPaquete" AS ENUM ('PENDIENTE', 'ENTREGADO');

-- CreateTable
CREATE TABLE "Paquete" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "unidadId" UUID NOT NULL,
    "empresa" VARCHAR(60) NOT NULL,
    "descripcion" VARCHAR(120),
    "recibidoAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoPaquete" NOT NULL DEFAULT 'PENDIENTE',
    "entregadoAt" TIMESTAMPTZ(3),
    "retiraNombre" VARCHAR(100),
    "retiraDocumento" VARCHAR(20),
    "registradoPorId" UUID NOT NULL,
    "entregadoPorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paquete_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Paquete_codigo_key" ON "Paquete"("codigo");

-- CreateIndex
CREATE INDEX "Paquete_estado_recibidoAt_idx" ON "Paquete"("estado", "recibidoAt");

-- CreateIndex
CREATE INDEX "Paquete_unidadId_recibidoAt_idx" ON "Paquete"("unidadId", "recibidoAt");

-- AddForeignKey
ALTER TABLE "Paquete" ADD CONSTRAINT "Paquete_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paquete" ADD CONSTRAINT "Paquete_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paquete" ADD CONSTRAINT "Paquete_entregadoPorId_fkey" FOREIGN KEY ("entregadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
