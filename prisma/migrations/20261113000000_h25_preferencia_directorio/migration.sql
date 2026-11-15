CREATE TABLE "preferencias_directorio" (
  "userId" UUID NOT NULL,
  "visible" BOOLEAN NOT NULL DEFAULT false,
  "mostrarTelefono" BOOLEAN NOT NULL DEFAULT false,
  "mostrarCorreo" BOOLEAN NOT NULL DEFAULT false,
  "mostrarUnidad" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "preferencias_directorio_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "preferencias_directorio" ADD CONSTRAINT "preferencias_directorio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
