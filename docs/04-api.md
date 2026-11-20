# API

**Documentación interactiva (Swagger):** [https://sonnet5.98.81.166.66.sslip.io/api/docs](https://sonnet5.98.81.166.66.sslip.io/api/docs). Esquema: [https://sonnet5.98.81.166.66.sslip.io/api/docs-json](https://sonnet5.98.81.166.66.sslip.io/api/docs-json). Disponible al activar la release 1.0.0; el despliegue anterior no enruta Swagger. API base: https://sonnet5.98.81.166.66.sslip.io/api/v1.

## Autenticación

POST /api/v1/auth/login recibe email y password. La respuesta contiene accessToken; en Swagger usar Authorize con el token, sin publicarlo. Enviar `Authorization: Bearer <token>`. JWT dura 15 minutos por configuración; refresh tokens duran 7 días, salvo configuración distinta. El frontend guarda sesión en cookie HttpOnly/Secure y usa Server Actions. CORS admite solo CORS_ORIGIN (el origen del frontend); no autoriza por sí mismo a un usuario. No hay registro público.

Errores habituales: 400 DTO inválido; 401 sesión ausente/vencida; 403 rol/vínculo no permitido; 404 recurso inexistente o privado; 409 conflicto de negocio. Las respuestas financieras y archivos privados no se cachean públicamente.

## Endpoints por módulo

Todas las rutas de las tablas incluyen el prefijo /api/v1. Los parámetros entre llaves son UUID; filtros y cuerpos se describen en Swagger. Las operaciones aplican rol y, cuando corresponde, propiedad o vínculo con la unidad.

### Autenticación y administración

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| POST | /api/v1/auth/login | Obtener tokens con email/password | Público; cuenta activa |
| POST | /api/v1/auth/refresh | Renovar sesión | Refresh token válido |
| POST | /api/v1/auth/logout | Cerrar la sesión | Usuario autenticado |
| GET | /api/v1/auth/me | Consultar identidad | Usuario autenticado |
| POST | /api/v1/users | Registrar residente | Administrador |
| GET | /api/v1/administracion/vinculos | Catálogos y asociaciones | Administrador |
| POST | /api/v1/administracion/vinculos | Asociar residente a unidad | Administrador |

### Módulo 1: Cuotas y pagos

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| GET | /api/v1/cuotas/mis-cuotas | Estado de cuenta por unidad | Residente vinculado |
| GET | /api/v1/cuotas/{id} | Detalle de cuota | Residente vinculado |
| GET | /api/v1/cuotas/generaciones/previa | Vista previa del período | Administrador |
| POST | /api/v1/cuotas/generaciones | Generar cuotas mensuales | Administrador |
| GET | /api/v1/administracion/cuotas | Listar cuotas para gestión | Administrador |
| PATCH | /api/v1/administracion/cuotas/{id} | Corregir o anular pendiente con motivo | Administrador |
| GET | /api/v1/administracion/morosidad | Resumen de deuda | Administrador |
| GET | /api/v1/administracion/morosidad/{unidadId} | Morosidad de una unidad | Administrador |
| POST | /api/v1/pagos | Pagar total mediante simulador | Residente vinculado |
| GET | /api/v1/pagos/{id} | Comprobante de su pago | Residente vinculado |

### Módulo 2: Reservas de áreas comunes

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| GET | /api/v1/areas | Catálogo de áreas | Residente, Administrador |
| GET | /api/v1/areas/{id}/disponibilidad | Disponibilidad de un día | Residente, Administrador |
| POST | /api/v1/areas | Crear área y horarios | Administrador |
| PATCH | /api/v1/areas/{id} | Editar o desactivar área | Administrador |
| POST | /api/v1/reservas | Solicitar reserva personal | Residente |
| GET | /api/v1/reservas/mias | Consultar sus reservas | Residente (creador) |
| GET | /api/v1/reservas/pendientes | Solicitudes por aprobar | Administrador |
| PATCH | /api/v1/reservas/{id}/aprobacion | Confirmar solicitud disponible y sin deuda | Administrador |
| PATCH | /api/v1/reservas/{id}/cancelacion | Cancelar con al menos 24 horas | Residente (creador) |

### Módulo 3: Incidencias y mantenimiento

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| POST | /api/v1/incidencias | Reportar con evidencias | Residente |
| GET | /api/v1/incidencias/mias | Consultar reportes propios | Residente |
| GET | /api/v1/incidencias | Listar para gestión | Administrador |
| GET | /api/v1/incidencias/responsables | Catálogo de responsables | Administrador |
| PATCH | /api/v1/incidencias/{id}/asignacion | Priorizar y asignar | Administrador |
| PATCH | /api/v1/incidencias/{id}/estado | Iniciar atención o resolver | Administrador |
| GET | /api/v1/incidencias/{id} | Detalle e historial privado | Residente creador, Administrador, Seguridad asignada |
| GET | /api/v1/incidencias/{incidenciaId}/evidencias/{evidenciaId} | Fotografía privada | Mismos permisos del detalle de incidencia |

### Módulo 4: Control de visitas

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| POST | /api/v1/visitas/autorizaciones | Preautorizar visita | Residente |
| GET | /api/v1/visitas/autorizaciones/mias | Consultar autorizaciones propias | Residente |
| PATCH | /api/v1/visitas/autorizaciones/{id}/cancelacion | Cancelar autorización propia | Residente |
| GET | /api/v1/visitas/autorizaciones | Buscar en control de accesos | Seguridad |
| POST | /api/v1/visitas/autorizaciones/solicitudes | Solicitar confirmación al residente | Seguridad |
| PATCH | /api/v1/visitas/autorizaciones/{id}/aprobacion | Aprobar solicitud recibida | Residente destinatario |
| POST | /api/v1/visitas/entradas | Registrar ingreso autorizado | Seguridad |
| POST | /api/v1/visitas/entradas/{id}/salida | Registrar salida | Seguridad |
| GET | /api/v1/visitas/presentes | Visitantes aún dentro | Seguridad, Administrador |

### Módulo 5: Paquetería

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| POST | /api/v1/paquetes | Recepción con aviso atómico | Seguridad |
| GET | /api/v1/paquetes | Pendientes e historial administrativo | Seguridad, Administrador |
| GET | /api/v1/paquetes/mios | Paquetes de sus unidades | Residente |
| GET | /api/v1/paquetes/{id}/residentes | Residentes habilitados para retirar | Seguridad, Administrador |
| POST | /api/v1/paquetes/{id}/entrega | Entregar a residente de la unidad | Seguridad |
| PATCH | /api/v1/paquetes/{id}/correccion | Corregir/anular con auditoría | Seguridad, Administrador |

### Módulo 6: Asambleas y votaciones

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| GET | /api/v1/asambleas | Convocatorias y temas visibles | Residente, Administrador |
| POST | /api/v1/asambleas | Crear convocatoria y agenda | Administrador |
| POST | /api/v1/asambleas/{id}/publicacion | Publicar asamblea | Administrador |
| GET | /api/v1/votaciones/{temaId}/miestado | Participación de su unidad | Residente vinculado |
| POST | /api/v1/votaciones/{temaId}/votos | Primer voto por unidad y tema | Residente vinculado |
| GET | /api/v1/votaciones/{temaId}/resultados | Resultados auditables después del cierre | Administrador |

### Módulo 7: Anuncios y comunicados

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| POST | /api/v1/comunicados | Publicar comunicado segmentado | Administrador |
| GET | /api/v1/comunicados/destinatarios | Vista previa de audiencia | Administrador |
| GET | /api/v1/comunicados/administracion | Consultar publicaciones | Administrador |
| GET | /api/v1/comunicados/mios | Comunicados de sus destinos | Residente |
| GET | /api/v1/comunicados/{id} | Detalle relevante sin confirmar lectura | Residente destinatario |

### Módulo 8: Directorio de residentes

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| GET | /api/v1/directorio/mis-preferencias | Consultar su privacidad | Residente |
| PUT | /api/v1/directorio/mis-preferencias | Configurar visibilidad y campos | Residente |
| GET | /api/v1/directorio | Buscar contactos visibles | Residente, Administrador, Seguridad |
| GET | /api/v1/directorio/{id} | Ficha con campos autorizados | Residente, Administrador, Seguridad |

### Módulo 9: Notificaciones

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| GET | /api/v1/notificaciones/mias | Avisos propios con filtros | Residente |
| PATCH | /api/v1/notificaciones/{id}/lectura | Marcar aviso propio como leído | Residente destinatario |

### Módulo 10: Reportes financieros y analíticos

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| GET | /api/v1/reportes/resumen | Indicadores generales por período | Administrador |
| GET | /api/v1/reportes/administrativos/pdf | Descargar PDF general para compartir | Administrador |

### Estado del servicio

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| GET | /api/v1/health/ready | Readiness sin secretos | Público |

La generación de avisos de H28 ocurre dentro de transacciones/eventos del servidor; no expone un endpoint para fabricar avisos arbitrarios. Los pagos no realizan cobros reales. Compartir reportes significa descargar/distribuir el PDF, no hacer público un endpoint administrativo. Swagger conserva además catálogos y adaptadores compatibles; sus DTO son la referencia exacta.
