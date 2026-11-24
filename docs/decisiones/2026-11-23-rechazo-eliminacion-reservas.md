# H6/H7: rechazo administrativo y eliminación del listado

## Comportamiento

El administrador puede rechazar una solicitud `PENDIENTE`, indicando un motivo de 3 a 500 caracteres (sin espacios exteriores). Se conserva la reserva con estado `RECHAZADA`, fecha, ID del administrador y motivo visible para el creador. No se puede rechazar una confirmada, cancelada o ya rechazada. No se añade rechazo automático ni envío de notificaciones.

El residente puede **eliminar de su listado** sus reservas canceladas, rechazadas o finalizadas (`fin <= ahora`). Es una eliminación lógica: se guarda `eliminadaAt`, se conserva la fila y su estado, y se excluye tanto de los resultados como del total de `GET /reservas/mias`. No elimina las reservas de otros residentes ni las activas; no libera un horario activo ni elude el límite de dos confirmadas futuras o la cancelación con al menos 24 horas. La regla fue confirmada por el solicitante.

## API

- `PATCH /api/v1/reservas/{id}/rechazo`, administrador: `{ "motivo": "Mantenimiento del área" }`. Responde 200 con ID, estado, motivo y fecha. Motivo inválido: 400; otro rol: 403; ID inexistente: 404; estado incompatible: 409.
- `DELETE /api/v1/reservas/{id}`, residente creador: responde 200 con ID y fecha de eliminación lógica. Activa: 409; ajena, inexistente o ya eliminada: 404; otro rol: 403.
- Sin autenticación ambas rutas responden 401. Las rutas nuevas figuran en Swagger; la interfaz incluye diálogos de confirmación.

## Integridad y concurrencia

Las operaciones utilizan la transacción del repositorio. El rechazo bloquea primero el usuario y después el área, igual que la aprobación, y actualiza solo si sigue `PENDIENTE`. Si compiten aprobación y rechazo, una operación termina y la otra recibe 409. La eliminación bloquea el usuario y repite el filtro de propietario, fecha/estado y `eliminadaAt` en la actualización.

## Migración y publicación

Se añaden tres migraciones aditivas: nuevo valor del enum, metadatos/restricciones del rechazo y fecha de eliminación lógica. El enum se añade en una migración independiente antes de usarlo en restricciones. No se modifica ninguna migración anterior ni se borran datos.

Aplicar con `npm run prisma:deploy`, generar el cliente y compilar. En Docker el cliente se genera durante la construcción y el servicio `migrate` aplica las migraciones antes de iniciar la API. Publicar backend y frontend coordinadamente: el frontend anterior no reconoce la etiqueta `RECHAZADA`. Respaldar antes de publicar; no usar `migrate reset`, `db push` ni `down -v`. Un rollback debe considerar que pueden existir filas `RECHAZADA` y metadatos nuevos.

Estos PR se proponen hacia `develop` para revisión de Heber. No cambian la versión desplegada en AWS ni crean una Release; la promoción aprobada hacia `main` y su despliegue son pasos posteriores.

## Validación reproducible

Usar Node 24 y `npm ci`. Las pruebas HTTP requieren una PostgreSQL aislada cuya URL termine en `_test`:

```bash
export DATABASE_URL=postgresql://USUARIO:CLAVE@localhost:PUERTO/reservas_hotfix_test
npm run prisma:generate
npm run prisma:deploy
npm run build
TEST_DATABASE_URL="$DATABASE_URL" npx vitest run --config vitest.config.e2e.ts test/reservas.e2e-spec.ts
npm test
npm run typecheck
npm run lint
```

La suite HTTP cubre motivos inválidos, permisos, conservación del historial, filtros y total del listado, estados incompatibles, reservas en curso, el plazo de cancelación y la carrera aprobación/rechazo. El frontend añade pruebas de confirmación, errores, motivo visible y navegación después de eliminar el último registro de una página.

## Resultado local — 23/11/2026

- Node 24.22.2: instalación limpia, cliente generado y build correctos.
- Las 21 migraciones se aplicaron en una base PostgreSQL 18 aislada; `prisma migrate diff --exit-code` no detectó diferencias con el esquema.
- Suite de reservas HTTP/PostgreSQL: 21 casos aprobados, incluidos los seis casos nuevos de rechazo/eliminación.
- `npm test`: 275 pruebas Vitest y 58 Jest aprobadas; typecheck correcto.
- Lint aprobado con una advertencia previa en la prueba de directorio H25, ajena a este cambio.
- Recorrido real en navegador local: administrador rechaza, residente consulta el motivo y elimina del listado; tras recargar no reaparece y el total es cero. La fila permanece en BD. Sin errores de JavaScript ni desbordamiento horizontal a 390 px.
