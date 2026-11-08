ALTER TABLE "asambleas"
ADD COLUMN "descripcion" VARCHAR(500),
ADD COLUMN "creada_por_id" UUID,
ADD COLUMN "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "asambleas"
ALTER COLUMN "estado" SET DEFAULT 'BORRADOR';

ALTER TABLE "asambleas"
ADD CONSTRAINT "asambleas_creada_por_id_fkey"
FOREIGN KEY ("creada_por_id")
REFERENCES "users"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "temas_votacion"
ADD COLUMN "apertura" TIMESTAMPTZ(3),
ADD COLUMN "cierre" TIMESTAMPTZ(3),
ADD COLUMN "notificado_apertura" BOOLEAN NOT NULL DEFAULT FALSE;

-- Se asignan fechas a los temas antiguos para no romper registros existentes.
UPDATE "temas_votacion" AS t
SET
  "apertura" = a."fecha",
  "cierre" = a."fecha" + INTERVAL '1 hour'
FROM "asambleas" AS a
WHERE t."asamblea_id" = a."id";

ALTER TABLE "temas_votacion"
ALTER COLUMN "apertura" SET NOT NULL,
ALTER COLUMN "cierre" SET NOT NULL;

CREATE INDEX "asambleas_estado_fechaHora_idx"
ON "asambleas"("estado", "fecha");

CREATE INDEX "temas_votacion_apertura_notificado_apertura_idx"
ON "temas_votacion"("apertura", "notificado_apertura");

CREATE UNIQUE INDEX "opciones_voto_tema_id_texto_key"
ON "opciones_voto"("tema_id", "texto");
