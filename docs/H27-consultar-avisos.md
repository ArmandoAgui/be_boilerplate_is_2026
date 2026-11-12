# H27 · Consultar avisos

Contrato del backend para la bandeja personal de notificaciones. Las rutas requieren un access token Bearer válido y una cuenta activa con rol `RESIDENTE`.

Base local: `http://localhost:3000/api/v1` · OpenAPI: `http://localhost:3000/api/docs`.

## Consultar mi bandeja

`GET /notificaciones/mias`

| Query          | Valores                                                           | Predeterminado |
| -------------- | ----------------------------------------------------------------- | -------------- |
| `moduloOrigen` | `CUOTAS`, `PAQUETERIA`, `COMUNICADOS`, `ASAMBLEAS`, `INCIDENCIAS` | Todos          |
| `estado`       | `NO_LEIDA`, `LEIDA`                                               | Ambos          |
| `pagina`       | Entero positivo dentro del rango seguro                           | `1`            |
| `tamanoPagina` | Entero de `1` a `50`                                              | `20`           |

Los filtros se pueden combinar. Parámetros desconocidos o repetidos, enums inválidos, decimales y valores fuera de rango devuelven `400 Bad Request`.

```http
GET /api/v1/notificaciones/mias?moduloOrigen=INCIDENCIAS&estado=LEIDA
Authorization: Bearer <accessToken>
```

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

`total` es el total propio que coincide con los filtros, antes de paginar. `noLeidas` cuenta todos los avisos propios en estado `NO_LEIDA` y no cambia por filtros ni por página. Una página sin resultados devuelve `datos: []` y conserva esos conteos. Los avisos se ordenan por fecha de creación descendente y, ante empate, por UUID descendente.

Cada elemento expone `id`, módulo, evento, título, mensaje, referencia, estado y fecha ISO 8601 UTC. `referenciaId` puede ser `null`. La respuesta nunca incluye `userId` ni `claveEvento`. Consultar la bandeja no modifica el aviso ni su fecha de lectura.

## Marcar como leído

`PATCH /notificaciones/:id/lectura`

La ruta no recibe body. El servidor obtiene el usuario del token y solo actualiza un aviso cuyo destinatario es ese usuario.

```http
PATCH /api/v1/notificaciones/1ab0d5c8-365c-4a5c-bdbd-09ce7183620f/lectura
Authorization: Bearer <accessToken>
```

```json
{
  "id": "1ab0d5c8-365c-4a5c-bdbd-09ce7183620f",
  "estado": "LEIDA",
  "leidaAt": "2026-11-12T15:05:00.000Z"
}
```

Repetir la solicitud, incluso de forma concurrente, devuelve `200` con la fecha original de lectura. Un UUID inválido, un aviso inexistente y uno de otra persona devuelven el mismo `404` para no revelar avisos ajenos. La transición a leído decrementa el contador una vez.

| Situación                                                     |   GET | PATCH |
| ------------------------------------------------------------- | ----: | ----: |
| Token ausente, inválido o expirado; cuenta borrada o inactiva | `401` | `401` |
| Administrador o usuario de Seguridad activo                   | `403` | `403` |
| Filtro o query inválida                                       | `400` |     — |
| UUID inválido, aviso inexistente o ajeno                      |     — | `404` |

## Modelo compartido con H28

H27 es dueño de la migración y del modelo `Notificacion`. H28 reutiliza esa tabla para crear y deduplicar avisos; no debe duplicar enums ni agregar otra tabla de bandeja.

| Campo               | Contrato de persistencia                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `id`                | UUID generado por Prisma.                                                                                          |
| `userId`            | Destinatario; FK a `User.id`, eliminación en cascada. Es interno y no se acepta desde la bandeja HTTP.             |
| `moduloOrigen`      | `CUOTAS`, `PAQUETERIA`, `COMUNICADOS`, `ASAMBLEAS`, `INCIDENCIAS`.                                                 |
| `tipoEvento`        | `CUOTA_POR_VENCER`, `PAQUETE_RECIBIDO`, `COMUNICADO_NUEVO`, `VOTACION_ABIERTA`, `INCIDENCIA_RESUELTA`.             |
| `titulo`, `mensaje` | Obligatorios, máximo 100 y 300 caracteres.                                                                         |
| `referenciaId`      | UUID opcional, sin FK al recurso de origen; admite `null`.                                                         |
| `claveEvento`       | Obligatoria, máximo 120 caracteres. Identificador idempotente interno, no se devuelve al cliente.                  |
| `estado`, `leidaAt` | `NO_LEIDA` por defecto. El CHECK exige `leidaAt = null` mientras no esté leída y fecha no nula al pasar a `LEIDA`. |
| `createdAt`         | Fecha del servidor, expuesta en HTTP como `creadaAt`.                                                              |

La restricción única es `(userId, claveEvento)`: la misma clave puede aparecer para destinatarios distintos, pero una entrega repetida al mismo destinatario no crea otra fila. H28 debe producir una clave estable para cada evento lógico y destinatario y manejar el conflicto como deduplicación. La composición concreta de la clave pertenece al servicio H28 según sus disparadores; el esquema de H27 fija la garantía de almacenamiento.

| Módulo        | Evento                |
| ------------- | --------------------- |
| `CUOTAS`      | `CUOTA_POR_VENCER`    |
| `PAQUETERIA`  | `PAQUETE_RECIBIDO`    |
| `COMUNICADOS` | `COMUNICADO_NUEVO`    |
| `ASAMBLEAS`   | `VOTACION_ABIERTA`    |
| `INCIDENCIAS` | `INCIDENCIA_RESUELTA` |

La bandeja se mantiene separada del futuro proveedor `NotificacionesService.crear(datos)`. H28 puede ampliar `NotificacionesModule` para exportar su proveedor sin cambiar las rutas GET/PATCH.

## Verificación backend

La suite HTTP y PostgreSQL vive en `test/notificaciones-h27.e2e-spec.ts`. Usa una base de pruebas dedicada cuyo nombre termine en `_test` y lee `TEST_DATABASE_URL` antes de importar la aplicación.

```powershell
$env:TEST_DATABASE_URL = 'postgresql://<usuario>:<clave>@localhost:5432/si_be_boilerplate_test'
$env:DATABASE_URL = $env:TEST_DATABASE_URL
npm run prisma:deploy
npm run test:e2e -- test/notificaciones-h27.e2e-spec.ts
```

No apuntes `TEST_DATABASE_URL` a una base con datos de desarrollo o producción; `prisma:deploy` aplica las migraciones pendientes al destino indicado.
