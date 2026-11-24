-- No se borran filas ni se altera el estado o el cupo de reservas activas.
ALTER TABLE "Reserva" ADD COLUMN "eliminadaAt" TIMESTAMPTZ(3);
