-- H9: persistencia de reportes, evidencias privadas e historial inicial.

CREATE TYPE "LugarTipo" AS ENUM ('UNIDAD', 'AREA_COMUN');
CREATE TYPE "Categoria" AS ENUM (
  'FUGA',
  'ELECTRICIDAD',
  'ASCENSOR',
  'LIMPIEZA',
  'SEGURIDAD',
  'OTRO'
);
CREATE TYPE "Prioridad" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'URGENTE');
CREATE TYPE "EstadoIncidencia" AS ENUM (
  'ABIERTA',
  'ASIGNADA',
  'EN_PROCESO',
  'RESUELTA'
);
CREATE TYPE "CampoHistorial" AS ENUM ('ESTADO', 'PRIORIDAD', 'RESPONSABLE');

CREATE SEQUENCE public.incidencias_codigo_seq AS BIGINT START WITH 1;

CREATE FUNCTION public.incidencia_codigo() RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  siguiente BIGINT;
BEGIN
  siguiente := nextval('public.incidencias_codigo_seq');
  RETURN 'INC-' || lpad(
    siguiente::TEXT,
    GREATEST(4, char_length(siguiente::TEXT)),
    '0'
  );
END;
$$;

CREATE TABLE "incidencias" (
  "id" UUID NOT NULL,
  "codigo" VARCHAR(32) NOT NULL DEFAULT public.incidencia_codigo(),
  "residente_id" UUID NOT NULL,
  "lugar_tipo" "LugarTipo" NOT NULL,
  "unidad_id" UUID,
  "area_id" UUID,
  "categoria" "Categoria" NOT NULL,
  "descripcion" VARCHAR(500) NOT NULL,
  "prioridad" "Prioridad",
  "estado" "EstadoIncidencia" NOT NULL DEFAULT 'ABIERTA',
  "responsable_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "incidencias_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "incidencias_codigo_key" UNIQUE ("codigo"),
  CONSTRAINT "incidencias_descripcion_length_check"
    CHECK (char_length("descripcion") BETWEEN 10 AND 500),
  CONSTRAINT "incidencias_lugar_check" CHECK (
    ("lugar_tipo" = 'UNIDAD' AND "unidad_id" IS NOT NULL AND "area_id" IS NULL)
    OR
    ("lugar_tipo" = 'AREA_COMUN' AND "area_id" IS NOT NULL AND "unidad_id" IS NULL)
  ),
  CONSTRAINT "incidencias_residente_id_fkey"
    FOREIGN KEY ("residente_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "incidencias_responsable_id_fkey"
    FOREIGN KEY ("responsable_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "incidencias_unidad_id_fkey"
    FOREIGN KEY ("unidad_id") REFERENCES "Unidad"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "incidencias_area_id_fkey"
    FOREIGN KEY ("area_id") REFERENCES "AreaComun"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "incidencias_residente_created_at_idx"
  ON "incidencias"("residente_id", "created_at" DESC);
CREATE INDEX "incidencias_responsable_id_idx"
  ON "incidencias"("responsable_id");
CREATE INDEX "incidencias_unidad_id_idx"
  ON "incidencias"("unidad_id");
CREATE INDEX "incidencias_area_id_idx"
  ON "incidencias"("area_id");

CREATE TABLE "evidencias_incidencia" (
  "id" UUID NOT NULL,
  "incidencia_id" UUID NOT NULL,
  "ruta" VARCHAR(255) NOT NULL,
  "mime" VARCHAR(20) NOT NULL,
  "tamano_bytes" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "evidencias_incidencia_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "evidencias_incidencia_ruta_key" UNIQUE ("ruta"),
  CONSTRAINT "evidencias_incidencia_mime_check"
    CHECK ("mime" IN ('image/jpeg', 'image/png')),
  CONSTRAINT "evidencias_incidencia_tamano_check"
    CHECK ("tamano_bytes" BETWEEN 1 AND 5242880),
  CONSTRAINT "evidencias_incidencia_incidencia_id_fkey"
    FOREIGN KEY ("incidencia_id") REFERENCES "incidencias"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "evidencias_incidencia_incidencia_id_idx"
  ON "evidencias_incidencia"("incidencia_id");

CREATE TABLE "historial_incidencia" (
  "id" UUID NOT NULL,
  "incidencia_id" UUID NOT NULL,
  "campo" "CampoHistorial" NOT NULL,
  "valor_anterior" VARCHAR(500),
  "valor_nuevo" VARCHAR(500) NOT NULL,
  "actor_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "historial_incidencia_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "historial_incidencia_incidencia_id_fkey"
    FOREIGN KEY ("incidencia_id") REFERENCES "incidencias"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "historial_incidencia_actor_id_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "historial_incidencia_incidencia_created_at_idx"
  ON "historial_incidencia"("incidencia_id", "created_at" DESC);
CREATE INDEX "historial_incidencia_actor_id_idx"
  ON "historial_incidencia"("actor_id");
