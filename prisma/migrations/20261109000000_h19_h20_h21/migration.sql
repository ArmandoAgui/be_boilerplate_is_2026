-- H20/H21. Paquete y EstadoPaquete pertenecen a H16 y se crean allí.
CREATE TYPE "EstadoAsamblea" AS ENUM ('BORRADOR', 'PUBLICADA');

CREATE TABLE "asambleas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "titulo" VARCHAR(100) NOT NULL,
    "fechaAt" TIMESTAMPTZ(3) NOT NULL,
    "descripcion" VARCHAR(500),
    "estado" "EstadoAsamblea" NOT NULL DEFAULT 'BORRADOR',
    "creadorId" UUID NOT NULL,
    "publicadaAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "asambleas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "asambleas_estado_fechaAt_idx" ON "asambleas"("estado", "fechaAt");
ALTER TABLE "asambleas" ADD CONSTRAINT "asambleas_creadorId_fkey"
    FOREIGN KEY ("creadorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "temas_votacion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "asambleaId" UUID NOT NULL,
    "pregunta" VARCHAR(150) NOT NULL,
    "aperturaAt" TIMESTAMPTZ(3) NOT NULL,
    "cierreAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "temas_votacion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "temas_votacion_asambleaId_idx" ON "temas_votacion"("asambleaId");
ALTER TABLE "temas_votacion" ADD CONSTRAINT "temas_votacion_asambleaId_fkey"
    FOREIGN KEY ("asambleaId") REFERENCES "asambleas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "opciones_voto" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "temaId" UUID NOT NULL,
    "texto" VARCHAR(100) NOT NULL,
    CONSTRAINT "opciones_voto_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "opciones_voto_temaId_texto_key" ON "opciones_voto"("temaId", "texto");
ALTER TABLE "opciones_voto" ADD CONSTRAINT "opciones_voto_temaId_fkey"
    FOREIGN KEY ("temaId") REFERENCES "temas_votacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "participaciones_voto" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "temaId" UUID NOT NULL,
    "unidadId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "participaciones_voto_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "participaciones_voto_unidadId_temaId_key" ON "participaciones_voto"("unidadId", "temaId");
ALTER TABLE "participaciones_voto" ADD CONSTRAINT "participaciones_voto_temaId_fkey"
    FOREIGN KEY ("temaId") REFERENCES "temas_votacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "participaciones_voto" ADD CONSTRAINT "participaciones_voto_unidadId_fkey"
    FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "votos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "temaId" UUID NOT NULL,
    "opcionId" UUID NOT NULL,
    CONSTRAINT "votos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "votos_temaId_opcionId_idx" ON "votos"("temaId", "opcionId");
ALTER TABLE "votos" ADD CONSTRAINT "votos_temaId_fkey"
    FOREIGN KEY ("temaId") REFERENCES "temas_votacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "votos" ADD CONSTRAINT "votos_opcionId_fkey"
    FOREIGN KEY ("opcionId") REFERENCES "opciones_voto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
