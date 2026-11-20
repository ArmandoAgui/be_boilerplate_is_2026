# Plan técnico de backend · H27: Consultar avisos en un solo lugar

- Historia: H27 / KAN-136.
- Repositorio: `be_boilerplate_is_2026`.
- Rama: `feature/H27_Consultar_Avisos_En_Un_Solo_Lugar`.
- Base: `origin/develop` en `323c70271c6db6de0f66c01584c5b7d5a4367908`, merge del PR #25 de H23.
- Estado: bloques 0–6 completados; documentación y revisión del bloque 7 en curso.
- Fuente funcional: `Documento_Tecnico_Final_H9_H10_H11_H12_H27_H28.pdf`, págs. 3–4 y 19–24. H27 define la bandeja y el modelo; H28 define el catálogo y el servicio interno de generación.

## 1. Alcance y dependencias

Un Residente activo consulta sus avisos paginados, obtiene su contador de no leídos y marca como leído un aviso del que es destinatario. El backend entrega módulo, evento y referencia para que la interfaz determine la navegación.

| Componente         | Responsabilidad                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H27 backend        | Modelo `Notificacion`, migración, listado, contador, marcado de lectura y protección por destinatario.                                                                                |
| H28 backend        | `NotificacionesService.crear(datos)`, resolución de destinatarios, escritura masiva con deduplicación y disparadores. Reutiliza el modelo de H27.                                     |
| H11 backend        | Tras confirmar la resolución y su historial, llama al servicio H28 con el autor como único destinatario. Conserva su rama local hasta integrar H28.                                   |
| H12 y frontend H27 | H12 provee el detalle privado de incidencias. El frontend H27 consume las dos rutas, refresca el contador cada 30 s, presenta `99+` y decide cómo navegar cuando falta la referencia. |

**Secuencia de integración:** H27 backend → H28 servicio común → H11 → H12 → validación del flujo integrado. H27 usa fixtures propios para validar la bandeja. Los avisos de H16/H20/H23 y la tarea de cuotas se conectan desde sus historias cuando exista el servicio común. La entrega de H27 se aprueba con su propio contrato y evidencia HTTP. V04 y V07 quedan para la integración correspondiente.

En la base revisada, `AppModule` registra el `JwtAuthGuard` global. El guard valida Bearer, relee el usuario y exige una cuenta activa. `CurrentUser` expone ese usuario, `PrismaModule` es global y `main.ts` aplica prefijo `api/v1`, transformación y rechazo de campos desconocidos. Hay adaptaciones provisionales de avisos en Paquetería y Comunicados; la base todavía carece de `Notificacion` y del proveedor compartido H28.

## 2. Contrato HTTP

Ambas rutas requieren `Authorization: Bearer <accessToken>` y rol `RESIDENTE`. La identidad efectiva es `CurrentUser.id`. El servidor responde 401 ante sesión ausente, inválida, expirada o cuenta inexistente/inactiva, y 403 ante un Administrador o usuario de Seguridad autenticado y activo.

### GET /api/v1/notificaciones/mias

| Query          | Validación                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| `moduloOrigen` | Opcional. `CUOTAS`, `PAQUETERIA`, `COMUNICADOS`, `ASAMBLEAS` o `INCIDENCIAS`. Omitir para ver todos. |
| `estado`       | Opcional. `NO_LEIDA` o `LEIDA`. Omitir para ver ambos.                                               |
| `pagina`       | Entero positivo. Por defecto `1`.                                                                    |
| `tamanoPagina` | Entero positivo. Por defecto `20`. Se propone máximo `50`, como en H10.                              |

- Aplicar primero la propiedad por usuario y los filtros. Ordenar por `createdAt DESC, id DESC` y paginar después. El UUID desempata fechas iguales de forma estable.
- `datos` contiene `id`, `moduloOrigen`, `tipoEvento`, `titulo`, `mensaje`, `referenciaId` (UUID o `null`), `estado` y `creadaAt` (ISO 8601 UTC).
- `total` cuenta todos los registros propios que coinciden con los filtros, antes de paginar. `noLeidas` cuenta todos los avisos propios en `NO_LEIDA`, independientemente de filtro y página. Los valores son enteros de backend. La interfaz aplica la abreviatura visual.
- Respuesta 200 con `{ datos, noLeidas, total, pagina, tamanoPagina }`. Una página vacía devuelve `datos: []` y los contadores correspondientes. El GET carece de efectos sobre el estado o la fecha de lectura.
- Respuesta 400 para enum inválido, parámetros desconocidos o repetidos, valores vacíos, paginación decimal/negativa o desplazamiento que exceda el rango soportado. Aceptar solo valores escalares y validar antes de consultar.

Ejemplo para `GET /api/v1/notificaciones/mias?moduloOrigen=INCIDENCIAS&estado=LEIDA`. La página tiene un aviso leído y el residente mantiene dos avisos no leídos fuera del resultado.

```json
{
  "datos": [
    {
      "id": "1ab0d5c8-365c-4a5c-bdbd-09ce7183620f",
      "moduloOrigen": "INCIDENCIAS",
      "tipoEvento": "INCIDENCIA_RESUELTA",
      "titulo": "Tu incidencia fue resuelta",
      "mensaje": "Tu incidencia INC-0001 fue resuelta.",
      "referenciaId": "6cbf93f1-8d6d-49c2-9fea-7192cf79f242",
      "estado": "LEIDA",
      "creadaAt": "2026-11-12T15:00:00.000Z"
    }
  ],
  "noLeidas": 2,
  "total": 1,
  "pagina": 1,
  "tamanoPagina": 20
}
```

Un aviso sin navegación directa mantiene la misma forma y devuelve `referenciaId: null`:

```json
{
  "id": "59f13b27-2bd2-4f29-91d9-d7f8d426c2e0",
  "moduloOrigen": "PAQUETERIA",
  "tipoEvento": "PAQUETE_RECIBIDO",
  "titulo": "Paquete recibido",
  "mensaje": "Hay un paquete en recepción.",
  "referenciaId": null,
  "estado": "NO_LEIDA",
  "creadaAt": "2026-11-11T14:58:00.000Z"
}
```

### PATCH /api/v1/notificaciones/:id/lectura

- Entrada: UUID del aviso en la ruta. La operación se solicita sin body. El servidor determina el destinatario, el estado y la fecha de lectura.
- Respuesta 200 con `{ id, estado: "LEIDA", leidaAt: "<ISO 8601 UTC>" }`. Se propone que repetir el PATCH propio devuelva 200 con la fecha original, incluso con solicitudes simultáneas.
- Respuesta 404 con el mismo cuerpo para aviso inexistente o ajeno. Se propone tratar un UUID malformado como 404 antes de consultar, en línea con los errores documentados de esta ruta.
- La primera lectura es la única operación que escribe el estado y `leidaAt`. La repetición conserva la fecha original, no crea avisos y no cambia otros datos.

## 3. Modelo y contrato compartido

| Campo Prisma                       | Regla                                                                                                                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                               | UUID, PK.                                                                                                                                                                                                           |
| `userId`                           | UUID, FK a `User.id`, obligatorio. Una fila por destinatario. Agregar la relación inversa en `User`.                                                                                                                |
| `moduloOrigen`, `tipoEvento`       | Enums compartidos. Declarar una sola vez el catálogo de abajo.                                                                                                                                                      |
| `titulo`, `mensaje`, `claveEvento` | Strings obligatorios. Límites de base propuestos con `VarChar(100)`, `VarChar(300)`, `VarChar(120)`. H28 valida entrada, contenido y correspondencia evento–módulo.                                                 |
| `referenciaId`                     | UUID nullable. Identifica un recurso de distintos módulos, sin FK a una tabla de origen.                                                                                                                            |
| `estado`, `leidaAt`                | Enum `EstadoNotificacion` con `NO_LEIDA` por defecto y `LEIDA`; fecha nullable. Propuesta: `CHECK` en migración para exigir fecha solo cuando está leída.                                                           |
| `createdAt`                        | Fecha del servidor con valor por defecto `now()`. Expuesta como `creadaAt`. Usar `Timestamptz(3)` para las dos fechas.                                                                                              |
| Restricciones                      | `@@unique([userId, claveEvento])` y `@@index([userId, createdAt])`. El mismo evento puede existir para usuarios distintos.                                                                                          |
| Nombres y relación                 | Propuesta: tabla `notificaciones`, columnas físicas en snake_case y `onDelete: Cascade` para la bandeja privada del usuario. Confirmar esa política con las convenciones del proyecto antes de cerrar la migración. |

| `ModuloOrigen` | `TipoEvento`          |
| -------------- | --------------------- |
| `CUOTAS`       | `CUOTA_POR_VENCER`    |
| `PAQUETERIA`   | `PAQUETE_RECIBIDO`    |
| `COMUNICADOS`  | `COMUNICADO_NUEVO`    |
| `ASAMBLEAS`    | `VOTACION_ABIERTA`    |
| `INCIDENCIAS`  | `INCIDENCIA_RESUELTA` |

El repositorio selecciona únicamente campos del contrato HTTP. `userId` y `claveEvento` son internos. No se devuelve el usuario relacionado. El identificador de referencia puede ser nulo o apuntar a un recurso posteriormente eliminado. La autorización del recurso se vuelve a evaluar en su propio módulo.

## 4. Bloques de implementación

### Bloque 0 · Preparar la rama y registrar la línea base

**Dependencias:** `origin/develop` y los módulos existentes de autenticación y Prisma.

- [x] Actualizar la referencia remota de `develop`, registrar el SHA y verificar que no haya una rama H27 publicada.
- [x] Crear la rama H27 desde esa referencia en una copia separada del backend. H11 permanece en su propia copia con sus cambios locales.
- [x] Inspeccionar autenticación, prefijo, validación global, schema, migraciones y patrón de suites HTTP de la base.
- [x] Antes de programar, volver a comprobar si entraron cambios concurrentes en `develop`, en especial en `schema.prisma`, migraciones y `AppModule`. Si la rama debe ponerse al día, hacerlo antes de crear la migración.
- [x] Registrar resultados de generación, compilación, lint, unitarias y despliegue del historial existente sobre PostgreSQL desechable. Separar problemas heredados de H27 antes de modificar el schema.

**Resultados de línea base:**

- `origin/develop` sigue en `323c70271c6db6de0f66c01584c5b7d5a4367908`; no hubo cambios concurrentes en `prisma/schema.prisma`, `prisma/migrations` ni `src/app.module.ts`.
- `npm ci` y `npm run prisma:generate` terminaron correctamente con Prisma 7.10.0. `npm run build` y `npm run typecheck` pasaron. `npm run lint` terminó con una advertencia heredada `typescript(no-misused-spread)` en `src/asambleas/asambleas.service.ts:15`. `npm test` pasó: 13 archivos y 141 pruebas.
- Se levantó PostgreSQL 18 en un contenedor temporal sin volumen. La base `si_be_h27_baseline_test` estaba vacía y sin `_prisma_migrations`; `npm run prisma:deploy` aplicó las 13 migraciones actuales, desde `20260920172640_init` hasta `20261111140000_h23_comunicados`. `prisma migrate status` confirmó que el historial está al día.
- La comparación del schema con esa base encontró una divergencia heredada: las migraciones de H19/H20/H21 establecen `DEFAULT gen_random_uuid()` para los IDs de `asambleas`, `temas_votacion`, `opciones_voto`, `participaciones_voto` y `votos`, mientras que el schema usa `@default(uuid())`; Prisma propone quitar esos cinco defaults de base. No pertenecen a H27 y deben quedar fuera de su migración.
- La base local persistente `si_be_boilerplate` del contenedor `si_be_postgres` estaba vacía: cero tablas públicas y sin `_prisma_migrations`. Se consultó en modo lectura y no se le aplicaron migraciones. No están definidas `DATABASE_URL` ni `TEST_DATABASE_URL`, así que no se verificó una base remota/compartida del equipo. No se creó ni aplicó una migración H27.

**Salida:** base reproducible y SHA confirmado. La preparación de rama y el documento quedan listos en esta entrega.

### Bloque 1 · Persistencia y migración

**Dependencias:** bloque 0.

- [x] Fijar el catálogo de H27 conforme al contrato funcional H27/H28 y añadir `Notificacion`, enums y relación inversa en `User` mediante una migración incremental propia. H28 deberá respetar estos nombres y longitudes al implementar su proveedor.
- [x] Revisar el SQL de la migración: FK a `users` con cascada, UUID, enums, longitudes, defaults, nulabilidad, índice y unicidad por usuario/clave. El `CHECK` exige `leida_at` nulo en `NO_LEIDA` y presente en `LEIDA`.
- [x] Probar migración desde una base vacía y desde otra con las 13 migraciones anteriores y datos existentes. Confirmar que los registros previos de `users` y `Comunicado` se conservan. Generar el cliente Prisma y validar compilación y tipos.
- [x] Verificar por fixtures que una misma clave se admite para destinatarios distintos y se rechaza para el mismo usuario; comprobar también FK, `CHECK` y cascada al eliminar usuario.

**Resultados de implementación:**

- `prisma/schema.prisma` define los catálogos `ModuloOrigen`, `TipoEvento` y `EstadoNotificacion`, el modelo `Notificacion` con las longitudes definidas para H27 (100/300/120), relación inversa en `User`, unicidad `(userId, claveEvento)` e índice `(userId, createdAt)`. Los campos internos `userId` y `claveEvento` quedan fuera del contrato HTTP.
- Se añadió `20261111150000_h27_notificaciones`. El SQL crea únicamente tipos y objetos H27. Se escribió como migración incremental revisada para no incluir las cinco operaciones heredadas `DROP DEFAULT` que propondría Prisma por la divergencia previa de H19/H20/H21.
- `prisma validate`, `prisma:generate`, `build` y `typecheck` pasaron. Desde base vacía se aplicaron 14 migraciones y `migrate status` quedó al día. En la prueba de actualización, Prisma aplicó solo H27 sobre las 13 anteriores; un usuario y un comunicado preexistentes se conservaron.
- Las restricciones rechazaron clave duplicada para el mismo usuario, estado/fecha incoherentes y destinatario inexistente. La misma clave para usuarios distintos fue aceptada; borrar un usuario eliminó sus avisos.
- `migrate diff` después de H27 conserva únicamente las cinco diferencias históricas de defaults documentadas en el bloque 0; no reporta divergencias en el esquema H27. No se aplicó la migración a la base persistente local.

**Salida:** H28 puede reutilizar la tabla y su garantía de deduplicación. El PR de H27 es dueño de esta migración.

### Bloque 2 · Identidad, validación y DTO

**Dependencias:** bloques 0–1.

- [x] Reutilizar el `JwtAuthGuard` global y preparar `ResidenteNotificacionesGuard` con la convención existente para operaciones protegidas. El controller aplicará la guardia y `CurrentUser` cuando se conecte en el bloque 5.
- [x] Añadir `NotificacionesActorService` para releer la cuenta por id, exigir que esté activa y comprobar el rol Residente. Las operaciones del controller pasarán `CurrentUser.id`; el servicio de bandeja volverá a validar el actor cuando se implemente en los bloques 3–5.
- [x] Definir DTO de query estricta y DTO de respuesta para aviso, página y lectura. Se valida enum, entero decimal/negativo, repetición como arreglo y rango seguro de paginación, sin importar DTO privados de Incidencias.
- [x] Documentar en los DTO y decoradores Swagger los enums, defaults, campos nullable, formato de fecha, respuestas 200 y sobres de error 400/401/403/404. El controller adjuntará esos decoradores a cada ruta en el bloque 5.

**Resultados de implementación:**

- El `JwtAuthGuard` global sigue siendo la autenticación base; la nueva guardia consulta el actor activo y devuelve 403 para Administrador o Seguridad. El servicio de actor repite esa comprobación para proteger invocaciones que no pasen por HTTP.
- La paginación usa los defaults 1/20, limita el tamaño a 50 y limita `pagina` para que `(pagina - 1) * 50` se mantenga dentro del rango entero seguro. La validación global `whitelist` + `forbidNonWhitelisted` rechazará filtros desconocidos; los valores repetidos fallan la validación del DTO.
- Las respuestas Swagger excluyen `userId` y `claveEvento`; `referenciaId` está documentado como UUID nullable y las fechas como ISO 8601 UTC. Se definieron sobres estándar para los errores Nest y una descripción 404 común para avisos inexistentes o ajenos.
- La conexión de `CurrentUser.id` a las dos operaciones se completará junto al controller en el bloque 5, cuando existan las consultas y el marcado de lectura de los bloques 3–4.

**Salida:** políticas de actor, DTO de validación y contrato Swagger preparados; los bloques 3–5 conectarán el actor autenticado con la bandeja y sus rutas.

### Bloque 3 · Listar y contar avisos propios

**Dependencias:** bloques 1–2.

- [x] Implementar en el repositorio página filtrada, total filtrado y contador global de no leídos en una transacción `RepeatableRead` con un mismo snapshot.
- [x] Exigir `userId` en todos los filtros. Aplicar módulo y estado solo a página/total; el contador usa únicamente destinatario y `NO_LEIDA`.
- [x] Seleccionar la proyección mínima, ordenar por fecha e id descendentes y usar `skip/take`. El servicio mapea `createdAt` a ISO UTC como `creadaAt`; las páginas vacías conservan sus conteos.
- [x] Mantener el caso de uso como consulta sin efectos laterales. No añadir otro índice sin mediciones.

**Resultados de implementación:**

- `NotificacionesRepository.listarMias` ejecuta los tres resultados dentro de una transacción interactiva `RepeatableRead`. Los conteos se validan como enteros seguros.
- `BandejaNotificacionesService.listarMias` vuelve a validar que el actor exista, esté activo y sea Residente; proyecta únicamente campos públicos y formatea `createdAt` con `toISOString()`.
- La rama de presentación aún no expone el GET; controller y rutas se registran en el bloque 5 después del marcado atómico del bloque 4. No se añadieron índices distintos de los definidos en la migración H27.
- `npm run build`, `npm run typecheck` pasaron. `npm run lint` solo reporta la advertencia preexistente de `src/asambleas/asambleas.service.ts:15`.

**Salida:** la capa de bandeja entrega listado y conteos coherentes por usuario; el endpoint compartido para campana y bandeja se integra en el bloque 5.

### Bloque 4 · Marcar lectura de forma atómica

**Dependencias:** bloques 1–2. Puede desarrollarse en la misma rama después del listado.

- [x] Validar UUID y actualizar con condición `id + userId + estado=NO_LEIDA`. Escribir `estado=LEIDA` y `leidaAt` en una sola operación `updateMany`.
- [x] Ejecutar actualización y lectura posterior dentro de una transacción `ReadCommitted`. La lectura queda acotada por `id + userId`; si no hay fila propia, devolver el mismo 404 que para un UUID inválido.
- [x] Seleccionar solo `id`, `estado` y `leidaAt`. El servicio devuelve 500 ante una fila propia incoherente; nunca inventa una fecha de lectura.
- [x] Verificar a nivel de servicio que dos solicitudes concurrentes devuelvan el mismo `leidaAt`, que el contador decremente una sola vez y que un intento ajeno no altere ninguna fila. La repetición HTTP se confirma al integrar el PATCH en los bloques 5–6.

**Resultados de implementación:**

- `NotificacionesRepository.marcarLeida` actualiza solo el aviso propio en `NO_LEIDA`; la fecha se asigna en la misma sentencia. Cuando `updateMany` no modifica fila, una lectura propia conserva la fecha original o se devuelve 404.
- `BandejaNotificacionesService.marcarLeida` vuelve a validar el Residente activo y exige `LEIDA` con fecha no nula. `NotificacionIdPipe` y la consulta usan el mismo mensaje de 404 para UUID inválido, aviso ajeno o inexistente.
- En PostgreSQL temporal se comprobaron dos llamadas simultáneas al servicio, repetición idempotente, decremento único del contador, privacidad ante usuario distinto y UUID malformado en el pipe. Las dos llamadas concurrentes conservaron la misma fecha; la consulta ajena no modificó la fila.
- `npm run build` y `npm run typecheck` pasaron. `npm run lint` conserva solo la advertencia preexistente de `src/asambleas/asambleas.service.ts:15`. El contenedor temporal se detuvo sin tocar la base local persistente.

**Salida:** el caso de uso y la persistencia garantizan una sola escritura efectiva por aviso y una respuesta estable al repetir la operación; el PATCH se expone en el bloque 5.

### Bloque 5 · Registrar rutas y dejar preparada la integración

**Dependencias:** bloques 2–4.

- [x] Registrar `NotificacionesModule` una sola vez en `AppModule`. Usa imports ESM con extensión `.js` y mantiene la separación controller → servicio de bandeja → repositorio → Prisma.
- [x] Montar `GET /api/v1/notificaciones/mias` y `PATCH /api/v1/notificaciones/:id/lectura`. La campana reutiliza el GET. `BandejaNotificacionesService` conserva el nombre separado del proveedor `NotificacionesService.crear` de H28.
- [x] Dejar documentados para H28 los enums, FK, longitudes, índice, clave única y referencia. H28 podrá ampliar este módulo y repositorio con creación y exportar su proveedor cuando esté implementado.
- [x] Documentar ejemplos de aviso con `referenciaId: null` y con UUID. La navegación queda a cargo del frontend cuando conecte sus pantallas.

**Resultados de implementación:**

- Nest registra ambos endpoints bajo `/api/v1/notificaciones`; el GET delega a la bandeja con `CurrentUser.id`, y el PATCH aplica el pipe UUID y delega con el mismo actor autenticado.
- Swagger publica GET con respuestas 200/400/401/403 y PATCH con 200/401/403/404, enum de filtros, enteros/defaults de página, `referenciaId` como UUID nullable y fechas ISO 8601 UTC.
- Se verificó el JSON de Swagger y que GET sin Bearer responda 401. La instancia de verificación usó PostgreSQL temporal vacío; el contenedor y el servidor se detuvieron al terminar. La base local persistente no se modificó.
- H28 aún no está integrado; `BandejaNotificacionesService` no ocupa el nombre reservado para su proveedor.

**Salida:** rutas visibles en Swagger y contrato de datos entregable a H28 y al frontend.

### Bloque 6 · Pruebas y evidencia de aceptación

**Dependencias:** bloques 1–5.

| Área               | Casos mínimos                                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validación         | Defaults, filtros válidos y combinados, parámetros extra/repetidos, valores fuera de rango y UUID inválido según la decisión adoptada.                                                      |
| Sesión y permisos  | Sin token, token inválido/expirado, cuenta inactiva o eliminada, roles Administrador y Seguridad. Un vecino de la misma unidad no lista ni marca avisos ajenos.                             |
| Bandeja y contador | Orden más reciente, desempate, 20 por defecto, segunda página, total filtrado, página vacía, contador independiente y dos residentes con contadores distintos. GET conserva estado y fecha. |
| Lectura            | Primer PATCH, repetición y dos solicitudes simultáneas; fecha ISO estable, contador decrece una sola vez y el 404 ajeno coincide con el inexistente.                                        |
| Persistencia       | Defaults, consistencia estado/fecha, FK y clave única por destinatario. Verificar que el DTO conserva referencia nula y excluye propiedades internas.                                       |

- [x] Usar Vitest y Supertest con PostgreSQL aislado. Exigir `TEST_DATABASE_URL` con una base dedicada de pruebas y sufijo `_test`, confirmar el destino antes de migrar, y asignar `DATABASE_URL` antes de importar `dist/app.module.js`. Reproducir el prefijo y la validación global en la suite.
- [x] Crear fixtures propias por prueba y limpiar solo sus filas y usuarios. La carga de fixtures usa Prisma directamente dentro de la suite, no una ruta HTTP de creación.
- [x] Cubrir el contrato backend de V06: sesión/roles, aislamiento por usuario, bandeja, contador, lectura repetible y concurrente, validación y restricciones de datos.
- [x] Registrar las verificaciones dependientes: V06 de interfaz (campana, refresco cada 30 s y `99+`) queda para el repositorio frontend; V04 (aviso al resolver) y V07 (deduplicación del proveedor) quedan para la integración del creador H28.
- [x] Generar el cliente y ejecutar build, typecheck, lint, pruebas unitarias, E2E y revisión del diff. La suite no fue omitida.

**Evidencia de ejecución:**

- Base confirmada antes de migrar: `127.0.0.1:55442/h27_notificaciones_test`, contenedor PostgreSQL temporal con `tmpfs` y sin mounts persistentes. Se aplicaron las 14 migraciones; el contenedor se elimina al cerrar esta verificación.
- `npm run test:e2e -- test/notificaciones-h27.e2e-spec.ts`: 1 archivo y 5 pruebas aprobadas. Incluye token ausente/inválido/expirado, cuenta inactiva/eliminada, Administrador/Seguridad, dos vecinos de una unidad, consultas, paginación, empate por UUID, no mutación GET y PATCH simultáneo/repetible.
- `npm run build`, `npm run typecheck`, `npm test` y `git diff --check`: aprobados; las pruebas unitarias registraron 13 archivos y 141 casos aprobados.
- `npm run lint`: código 0; conserva un aviso existente en `src/asambleas/asambleas.service.ts:15` sobre spread de una instancia de clase.
- La suite verifica directamente en PostgreSQL los defaults, la FK, unicidad de clave por destinatario y el CHECK estado/fecha. El DTO no expone `userId` ni `claveEvento`.

```powershell
# DATABASE_URL debe apuntar a la base de pruebas confirmada antes de aplicar migraciones.
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run build
npm run typecheck
npm run lint
npm test
npm run test:e2e -- test/notificaciones-h27.e2e-spec.ts
git diff --check
```

**Salida:** evidencia HTTP y de base de datos que demuestra privacidad, filtros y lectura repetible. Las pruebas H27 funcionan con fixtures antes de integrar H28.

### Bloque 7 · Documentación, revisión y entrega a H28

**Dependencias:** bloque 6.

- [x] Crear la guía del backend H27 y enlazarla desde README con contratos, ejemplos, permisos, decisiones adoptadas y comandos de verificación.
- [x] Revisar el diff y la migración contra el último `develop`. En esta revisión `origin/develop` continúa en `323c70271c6db6de0f66c01584c5b7d5a4367908`; H27 no añade diferencias ajenas a la historia.
- [ ] Preparar un PR de H27 dirigido a `develop` con migración, rutas, validación y evidencia. Una vez integrado, registrar el SHA base que usará H28.
- [x] Entregar a H28 la tabla/enums y el contrato de deduplicación en la guía H27. La integración del proveedor H28 y la reanudación del bloque 5 de H11 quedan pendientes de su rama y dependencias.

**Cierre de H27 backend:** migración incremental revisada, ambas rutas operativas para el Residente activo, aislamiento por destinatario probado, contador independiente de los filtros y primera fecha de lectura preservada.

## 5. Archivos previstos

| Archivo o carpeta                                                                        | Responsabilidad                                   |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `prisma/schema.prisma`, `prisma/migrations/<timestamp>_h27_notificaciones/migration.sql` | Modelo, catálogo, relación y garantías de datos.  |
| `src/notificaciones/notificaciones.module.ts`, `src/app.module.ts`                       | Registro del módulo.                              |
| `src/notificaciones/controllers/`, `dto/`, `guards/`                                     | Rutas, validación, Swagger y acceso Residente.    |
| `src/notificaciones/services/`, `repositories/`                                          | Bandeja, contador, marcado y consultas Prisma.    |
| `test/notificaciones-h27.e2e-spec.ts`, unitarias junto al código                         | Contrato HTTP, privacidad, estado y concurrencia. |
| `docs/H27-consultar-avisos.md`, `README.md`                                              | Guía del backend una vez implementado.            |
