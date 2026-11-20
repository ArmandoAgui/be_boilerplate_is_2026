CREATE TYPE "Alcance" AS ENUM ('TODOS', 'TORRE', 'SECCION');
CREATE TABLE "Comunicado" (
  "id" UUID NOT NULL,
  "titulo" VARCHAR(100) NOT NULL,
  "contenido" VARCHAR(2000) NOT NULL,
  "alcance" "Alcance" NOT NULL,
  "torreId" UUID,
  "seccionId" UUID,
  "autorId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Comunicado_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "comunicado_textos" CHECK (char_length(btrim(titulo)) BETWEEN 5 AND 100 AND char_length(btrim(contenido)) BETWEEN 1 AND 2000),
  CONSTRAINT "comunicado_alcance" CHECK (
    (alcance = 'TODOS' AND "torreId" IS NULL AND "seccionId" IS NULL) OR
    (alcance = 'TORRE' AND "torreId" IS NOT NULL AND "seccionId" IS NULL) OR
    (alcance = 'SECCION' AND "torreId" IS NULL AND "seccionId" IS NOT NULL)
  )
);
CREATE TABLE "LecturaComunicado" (
  "id" UUID NOT NULL,
  "comunicadoId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "leidoAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LecturaComunicado_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Comunicado_createdAt_id_idx" ON "Comunicado"("createdAt", "id");
CREATE INDEX "Comunicado_torreId_idx" ON "Comunicado"("torreId");
CREATE INDEX "Comunicado_seccionId_idx" ON "Comunicado"("seccionId");
CREATE UNIQUE INDEX "LecturaComunicado_comunicadoId_userId_key" ON "LecturaComunicado"("comunicadoId", "userId");
CREATE INDEX "LecturaComunicado_userId_idx" ON "LecturaComunicado"("userId");
ALTER TABLE "Comunicado" ADD CONSTRAINT "Comunicado_torreId_fkey" FOREIGN KEY ("torreId") REFERENCES "Torre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Comunicado" ADD CONSTRAINT "Comunicado_seccionId_fkey" FOREIGN KEY ("seccionId") REFERENCES "Seccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Comunicado" ADD CONSTRAINT "Comunicado_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LecturaComunicado" ADD CONSTRAINT "LecturaComunicado_comunicadoId_fkey" FOREIGN KEY ("comunicadoId") REFERENCES "Comunicado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LecturaComunicado" ADD CONSTRAINT "LecturaComunicado_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
