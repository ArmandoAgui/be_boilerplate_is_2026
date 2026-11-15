-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PROCESANDO', 'APROBADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "Pago" (
    "id" UUID NOT NULL,
    "numero" SERIAL NOT NULL,
    "referencia" VARCHAR(20) NOT NULL,
    "cuotaId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "ultimos4" CHAR(4) NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PROCESANDO',
    "motivoRechazo" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pago_numero_key" ON "Pago"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_referencia_key" ON "Pago"("referencia");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_idempotencyKey_key" ON "Pago"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Pago_cuotaId_idx" ON "Pago"("cuotaId");

-- CreateIndex
CREATE INDEX "Pago_userId_idx" ON "Pago"("userId");

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_cuotaId_fkey" FOREIGN KEY ("cuotaId") REFERENCES "Cuota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
