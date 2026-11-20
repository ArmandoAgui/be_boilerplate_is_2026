-- Decisión explícita del usuario (29/10/2026): reservas personales, cupo y acceso por creador.
-- Conservar la unidad de registros anteriores como dato histórico; nuevas reservas no la requieren.
ALTER TABLE "Reserva" ALTER COLUMN "unidadId" DROP NOT NULL;
CREATE INDEX "Reserva_userId_estado_inicio_idx" ON "Reserva"("userId", "estado", "inicio");
