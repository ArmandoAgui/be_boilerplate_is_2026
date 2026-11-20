# Recuperación temporal de develop

Las integraciones H19, H20 y H21 referenciaban modelos y estados ausentes
(`Paquete`, `EstadoPaquete`, `EstadoTemaVotacion` y `OpcionVoto`). El
`postinstall` ejecuta Prisma y una instalación nueva fallaba con P1012.
Que Git permita un merge solo demuestra que pudo combinar los archivos;
no valida dependencias, tipos, migraciones ni comportamiento.

Esta recuperación revierte temporalmente esas integraciones. Conserva
autenticación, reservas, cuotas H1/H3, morosidad H4 y visitas H13. Las ramas
y commits originales continúan disponibles para completar las historias.
No modifica la rama de visitas H14 ni introduce modelos alternativos.

## Verificación desde una instalación nueva

Usar Node 24, configurar el entorno según `.env.example` y apuntar
`DATABASE_URL` a una base local. Ejecutar:

```sh
npm ci
npx prisma validate
npm run prisma:deploy
npm run build
npm run typecheck
npm run lint
npm test
```

Las pruebas HTTP necesitan una base aislada cuyo nombre termine en `_test`:

```sh
# Configurar TEST_DATABASE_URL con esa base, nunca con datos compartidos.
npm run test:e2e
```

Si una base existente tiene migraciones de asambleas aplicadas o fallidas,
revisar `npx prisma migrate status` y su historial con el equipo antes de
modificarla. Esta recuperación se valida desde una base vacía: no borra
datos ni resetea bases existentes, y no repara automáticamente su historial.

## Reintegración de las historias

1. Acordar una única definición de modelos y migraciones con sus responsables.
2. Completar el registro de módulos Nest y las dependencias de package.json.
3. Preparar un PR coordinado desde develop que restaure el código retirado
   e incluya todas las dependencias. Git conserva los merges anteriores:
   volver a fusionar las mismas ramas por sí solo no deshace esta reversión.
4. Validar instalación, migraciones desde cero, build y pruebas del resultado
   integrado antes de volver a publicarlo en develop.
