ALTER TABLE "Reserva"
  ADD COLUMN "rechazadaAt" TIMESTAMPTZ(3),
  ADD COLUMN "motivoRechazo" VARCHAR(500),
  ADD COLUMN "rechazadaPorId" UUID;

ALTER TABLE "Reserva" DROP CONSTRAINT reserva_cancelacion;
ALTER TABLE "Reserva" ADD CONSTRAINT reserva_cancelacion CHECK (
  (estado IN ('PENDIENTE', 'CONFIRMADA', 'RECHAZADA') AND "canceladaAt" IS NULL)
  OR (estado = 'CANCELADA' AND "canceladaAt" IS NOT NULL)
);
ALTER TABLE "Reserva" ADD CONSTRAINT reserva_rechazo CHECK (
  (estado = 'RECHAZADA' AND "rechazadaAt" IS NOT NULL
    AND "rechazadaPorId" IS NOT NULL AND length(trim("motivoRechazo")) BETWEEN 3 AND 500
    AND "motivoRechazo" IS NOT NULL)
  OR (estado <> 'RECHAZADA' AND "rechazadaAt" IS NULL
    AND "rechazadaPorId" IS NULL AND "motivoRechazo" IS NULL)
);
