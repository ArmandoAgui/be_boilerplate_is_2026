# API

Swagger público: [https://sonnet5.98.81.166.66.sslip.io/api/docs](https://sonnet5.98.81.166.66.sslip.io/api/docs). Esquema: [https://sonnet5.98.81.166.66.sslip.io/api/docs-json](https://sonnet5.98.81.166.66.sslip.io/api/docs-json). Disponible al activar la release 1.0.0; el despliegue anterior no enruta Swagger. API base: https://sonnet5.98.81.166.66.sslip.io/api/v1.

## Autenticación

POST /api/v1/auth/login recibe email y password. La respuesta contiene accessToken; en Swagger usar Authorize con el token, sin publicarlo. Enviar `Authorization: Bearer <token>`. JWT dura 15 minutos por configuración; refresh tokens duran 7 días, salvo configuración distinta. El frontend guarda sesión en cookie HttpOnly/Secure y usa Server Actions. CORS admite solo CORS_ORIGIN (el origen del frontend); no autoriza por sí mismo a un usuario. No hay registro público.

Errores habituales: 400 DTO inválido; 401 sesión ausente/vencida; 403 rol/vínculo no permitido; 404 recurso inexistente o privado; 409 conflicto de negocio. Las respuestas financieras y archivos privados no se cachean públicamente.

## Endpoints por módulo (resumen)

| Módulo | Método y ruta bajo /api/v1 | Uso / rol |
|---|---|---|
| Autenticación | POST /auth/login, POST /auth/refresh, POST /auth/logout; GET /auth/me | Inicio/renovación/cierre e identidad |
| Administración | POST /users; /administracion/vinculos y /administracion/cuotas | Alta/vínculos y correcciones; Administrador |
| Cuotas/pagos | GET /cuotas/mis-cuotas, GET /cuotas/:id; POST /pagos | Residente vinculado; pago completo simulado |
| Cuotas | GET /cuotas/generaciones/previa; POST /cuotas/generaciones; GET /administracion/morosidad | Administrador |
| Reservas | GET /areas, GET /areas/:id/disponibilidad; POST /reservas; GET /reservas/mias | Residente/Administrador según operación |
| Áreas/aprobaciones | POST /areas; PATCH /areas/:id; GET /reservas/pendientes; PATCH /reservas/:id/aprobacion | Administrador |
| Cancelación | PATCH /reservas/:id/cancelacion | Creador, con >=24 h |
| Incidencias | POST /incidencias; GET /incidencias/mias, GET /incidencias/:id y /incidencias/:id/evidencias/:evidenciaId | Residente propio, administrador y seguridad asignada para detalle |
| Gestión incidencias | GET /incidencias, GET /incidencias/responsables; PATCH /incidencias/:id/asignacion y /incidencias/:id/estado | Administrador |
| Visitas | POST/GET /visitas/autorizaciones; GET /visitas/autorizaciones/mias; PATCH /visitas/autorizaciones/:id/cancelacion | Residente creador; búsqueda permitida a Seguridad |
| Acceso | POST /visitas/autorizaciones/solicitudes; PATCH /visitas/autorizaciones/:id/aprobacion; POST /visitas/entradas y /visitas/entradas/:id/salida; GET /visitas/presentes | Seguridad solicita/registra; residente aprueba |
| Paquetes | POST/GET /paquetes; acciones de entrega/corrección en Swagger | Seguridad/Administrador; residente solo su unidad |
| Asambleas/voto | GET/POST /asambleas; POST /asambleas/:id/publicacion; GET /votaciones/:temaId/miestado y /votaciones/:temaId/resultados; POST /votaciones/:temaId/votos | Admin convoca; residentes votan; resultados tras cierre |
| Comunicados | POST /comunicados; GET /comunicados/destinatarios y /comunicados/administracion; GET /comunicados/mios y /comunicados/:id | Admin publica; residente consulta sus destinos |
| Directorio | GET /directorio; GET/PUT /directorio/mis-preferencias | Consulta de los tres roles; preferencia del residente |
| Avisos | GET /notificaciones/mias; PATCH /notificaciones/:id/lectura | Residente destinatario |
| Reportes | GET /reportes/resumen; GET /reportes/administrativos/pdf | Administrador; indicadores y PDF generales |
| Salud | GET /health/ready | Readiness sin secretos |

Swagger es la referencia exacta de DTO, métodos y rutas; esta tabla es un índice de recorridos. Los pagos no realizan cobros reales. Compartir reportes significa descargar/distribuir el PDF, no hacer público un endpoint administrativo.
