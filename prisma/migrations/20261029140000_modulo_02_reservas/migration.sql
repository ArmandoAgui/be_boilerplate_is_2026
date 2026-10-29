-- Secuencia global: códigos únicos incluso al reservar áreas distintas simultáneamente.
CREATE SEQUENCE reserva_codigo_seq;
CREATE FUNCTION reserva_codigo() RETURNS text LANGUAGE plpgsql AS $$
DECLARE n text;
BEGIN
  n := nextval('reserva_codigo_seq')::text;
  RETURN 'RES-' || lpad(n, greatest(6, length(n)), '0');
END;
$$;
-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('RESIDENTE', 'ADMINISTRADOR', 'SEGURIDAD');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('CONFIRMADA', 'CANCELADA');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "nombre" TEXT NOT NULL DEFAULT 'Residente',
ADD COLUMN     "rol" "Rol" NOT NULL DEFAULT 'RESIDENTE',
ADD COLUMN     "telefono" TEXT;

-- CreateTable
CREATE TABLE "Torre" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(30) NOT NULL,

    CONSTRAINT "Torre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seccion" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(30) NOT NULL,
    "torreId" UUID NOT NULL,

    CONSTRAINT "Seccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unidad" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "torreId" UUID NOT NULL,
    "seccionId" UUID NOT NULL,
    "cuotaMensual" DECIMAL(10,2) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Unidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioUnidad" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "unidadId" UUID NOT NULL,

    CONSTRAINT "UsuarioUnidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaComun" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "capacidad" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AreaComun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorarioArea" (
    "id" UUID NOT NULL,
    "areaId" UUID NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" VARCHAR(5) NOT NULL,
    "horaFin" VARCHAR(5) NOT NULL,

    CONSTRAINT "HorarioArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL DEFAULT reserva_codigo(),
    "areaId" UUID NOT NULL,
    "unidadId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "inicio" TIMESTAMPTZ(3) NOT NULL,
    "fin" TIMESTAMPTZ(3) NOT NULL,
    "asistentes" INTEGER NOT NULL,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'CONFIRMADA',
    "canceladaAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Torre_nombre_key" ON "Torre"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Seccion_torreId_nombre_key" ON "Seccion"("torreId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Seccion_id_torreId_key" ON "Seccion"("id", "torreId");

-- CreateIndex
CREATE UNIQUE INDEX "Unidad_codigo_key" ON "Unidad"("codigo");

-- CreateIndex
CREATE INDEX "UsuarioUnidad_unidadId_idx" ON "UsuarioUnidad"("unidadId");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioUnidad_userId_unidadId_key" ON "UsuarioUnidad"("userId", "unidadId");

-- CreateIndex
CREATE UNIQUE INDEX "AreaComun_nombre_key" ON "AreaComun"("nombre");

-- CreateIndex
CREATE INDEX "HorarioArea_areaId_diaSemana_idx" ON "HorarioArea"("areaId", "diaSemana");

-- CreateIndex
CREATE UNIQUE INDEX "Reserva_codigo_key" ON "Reserva"("codigo");

-- CreateIndex
CREATE INDEX "Reserva_areaId_inicio_fin_idx" ON "Reserva"("areaId", "inicio", "fin");

-- CreateIndex
CREATE INDEX "Reserva_unidadId_estado_inicio_idx" ON "Reserva"("unidadId", "estado", "inicio");

-- AddForeignKey
ALTER TABLE "Seccion" ADD CONSTRAINT "Seccion_torreId_fkey" FOREIGN KEY ("torreId") REFERENCES "Torre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unidad" ADD CONSTRAINT "Unidad_torreId_fkey" FOREIGN KEY ("torreId") REFERENCES "Torre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unidad" ADD CONSTRAINT "Unidad_seccionId_torreId_fkey" FOREIGN KEY ("seccionId", "torreId") REFERENCES "Seccion"("id", "torreId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioUnidad" ADD CONSTRAINT "UsuarioUnidad_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioUnidad" ADD CONSTRAINT "UsuarioUnidad_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioArea" ADD CONSTRAINT "HorarioArea_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AreaComun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AreaComun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Invariantes simples adicionales en la BD (horarios y concurrencia se validan con bloqueo).
ALTER TABLE "AreaComun" ADD CONSTRAINT area_capacidad CHECK (capacidad BETWEEN 1 AND 500), ADD CONSTRAINT area_nombre CHECK (char_length(btrim(nombre)) BETWEEN 3 AND 60);
ALTER TABLE "HorarioArea" ADD CONSTRAINT horario_valido CHECK ("diaSemana" BETWEEN 0 AND 6 AND "horaInicio" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "horaFin" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "horaFin" > "horaInicio");
ALTER TABLE "Reserva" ADD CONSTRAINT reserva_intervalo CHECK (fin > inicio AND fin - inicio BETWEEN interval '1 hour' AND interval '4 hours' AND date_trunc('hour', inicio AT TIME ZONE 'UTC') = inicio AT TIME ZONE 'UTC' AND date_trunc('hour', fin AT TIME ZONE 'UTC') = fin AT TIME ZONE 'UTC'), ADD CONSTRAINT reserva_asistentes CHECK (asistentes >= 1), ADD CONSTRAINT reserva_cancelacion CHECK ((estado = 'CONFIRMADA' AND "canceladaAt" IS NULL) OR (estado = 'CANCELADA' AND "canceladaAt" IS NOT NULL));
