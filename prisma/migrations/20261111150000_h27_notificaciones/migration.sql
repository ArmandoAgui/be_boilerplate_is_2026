CREATE TYPE "ModuloOrigen" AS ENUM (
  'CUOTAS',
  'PAQUETERIA',
  'COMUNICADOS',
  'ASAMBLEAS',
  'INCIDENCIAS'
);

CREATE TYPE "TipoEvento" AS ENUM (
  'CUOTA_POR_VENCER',
  'PAQUETE_RECIBIDO',
  'COMUNICADO_NUEVO',
  'VOTACION_ABIERTA',
  'INCIDENCIA_RESUELTA'
);

CREATE TYPE "EstadoNotificacion" AS ENUM ('NO_LEIDA', 'LEIDA');

CREATE TABLE "notificaciones" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "modulo_origen" "ModuloOrigen" NOT NULL,
  "tipo_evento" "TipoEvento" NOT NULL,
  "titulo" VARCHAR(100) NOT NULL,
  "mensaje" VARCHAR(300) NOT NULL,
  "referencia_id" UUID,
  "clave_evento" VARCHAR(120) NOT NULL,
  "estado" "EstadoNotificacion" NOT NULL DEFAULT 'NO_LEIDA',
  "leida_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notificaciones_estado_lectura_check" CHECK (
    ("estado" = 'NO_LEIDA' AND "leida_at" IS NULL) OR
    ("estado" = 'LEIDA' AND "leida_at" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "notificaciones_user_id_clave_evento_key"
  ON "notificaciones"("user_id", "clave_evento");

CREATE INDEX "notificaciones_user_id_created_at_idx"
  ON "notificaciones"("user_id", "created_at");

ALTER TABLE "notificaciones"
  ADD CONSTRAINT "notificaciones_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
