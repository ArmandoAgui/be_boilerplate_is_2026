-- Separado de la migración que usa el nuevo valor: PostgreSQL debe confirmar
-- el cambio del enum antes de utilizarlo en restricciones o escrituras.
ALTER TYPE "EstadoReserva" ADD VALUE 'RECHAZADA';
