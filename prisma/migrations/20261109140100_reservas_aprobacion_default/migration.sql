-- Separada para que PostgreSQL pueda usar el valor del enum ya confirmado.
ALTER TABLE "Reserva" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';
ALTER TABLE "Reserva" DROP CONSTRAINT reserva_cancelacion;
ALTER TABLE "Reserva" ADD CONSTRAINT reserva_cancelacion CHECK (
  (estado IN ('PENDIENTE', 'CONFIRMADA') AND "canceladaAt" IS NULL)
  OR (estado = 'CANCELADA' AND "canceladaAt" IS NOT NULL)
);
