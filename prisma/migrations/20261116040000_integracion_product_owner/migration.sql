-- Additive migration: preserve history and existing payments/votes.
ALTER TYPE "EstadoCuota" ADD VALUE IF NOT EXISTS 'ANULADA';
ALTER TYPE "EstadoPaquete" ADD VALUE IF NOT EXISTS 'ANULADO';
ALTER TYPE "EstadoAutorizacion" ADD VALUE IF NOT EXISTS 'PENDIENTE';
ALTER TABLE "MovimientoVisita" DROP CONSTRAINT IF EXISTS "MovimientoVisita_autorizacionId_key";
DROP INDEX IF EXISTS "MovimientoVisita_autorizacionId_key";
CREATE UNIQUE INDEX "movimiento_autorizacion_presente_key" ON "MovimientoVisita" ("autorizacionId") WHERE "salidaAt" IS NULL;
-- Previously used authorizations become reusable inside their original window.
UPDATE "AutorizacionVisita" SET estado = 'VIGENTE' WHERE estado = 'USADA';
ALTER TABLE "Paquete" ADD COLUMN "retiraResidenteId" UUID, ADD COLUMN "correccionMotivo" VARCHAR(300);
ALTER TABLE "participaciones_voto" ADD COLUMN "opcionId" UUID;
ALTER TABLE "participaciones_voto" ADD CONSTRAINT "participaciones_voto_opcionId_fkey" FOREIGN KEY ("opcionId") REFERENCES "opciones_voto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "AuditoriaAdministrativa" (
 "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "actorId" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 "recurso" TEXT NOT NULL, "recursoId" UUID NOT NULL, "accion" TEXT NOT NULL,
 "motivo" VARCHAR(300) NOT NULL, "anterior" JSONB NOT NULL, "nuevo" JSONB NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "Cuota" ADD COLUMN "recargoAplicado" DECIMAL(10,2) NOT NULL DEFAULT 0;
