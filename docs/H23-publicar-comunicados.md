# H23 — Publicar comunicado segmentado (KAN-120)

Fuente: Jira KAN-120/KAN-135, consultadas 11/11/2026. Responsable: Armando.
Base revisada: develop backend fc99092, frontend 3f3b359. Ya están fusionadas aprobación de reservas, H9 frontend y H19–H21. Sprint 1 cerrado; H23 y H24 son las dos historias de Armando en Sprint 2.

## Contrato y alcance

Administrador: POST /api/v1/comunicados; GET /api/v1/comunicados/administracion; GET /api/v1/torres. Título recortado 5–100, contenido 1–2000, TODOS/TORRE/SECCION y destino obligatorio y existente en los dos últimos. No hay edición, borradores ni eliminación. Identidad del autor viene de sesión.

Extensión necesaria para la confirmación con cantidad real: GET /api/v1/comunicados/destinatarios?alcance=...&destinoId=... devuelve {destinatarios}; exclusivamente administrador. No expone identidades. La publicación vuelve a resolver el alcance; si las vinculaciones cambian entre previa y publicación, el resultado final informa la cantidad actual.

La audiencia son residentes activos, deduplicados por usuario. TODOS incluye residentes sin unidad; TORRE/SECCION se resuelven por UsuarioUnidad. No se agrega exclusión por fecha de ingreso ni por unidad inactiva, reglas que H23/H24 no especifican. Catálogo muestra el nombre de torre junto a secciones para evitar homónimos ambiguos.

Comunicado y LecturaComunicado se crean en una migración aditiva de H23; H24 usa estos mismos modelos. El listado administrativo calcula X/N sobre la audiencia actual, contando solo lecturas de residentes actualmente en ese alcance. Así H24 puede incluir recién ingresados sin que una lectura futura exceda un total congelado antiguo. El historial de lecturas no se elimina si cambia la audiencia. La fecha de API es creadoAt; en persistencia, createdAt.

## H28: dependencia pendiente, no se declara envío real

NotificacionesService todavía no existe en develop y KAN-135 está en Idea. Se deja el puerto de inyección NOTIFICACIONES_COMUNICADOS local al módulo para conectar el servicio real mediante useExisting cuando se integre H28. No se crea una bandeja ni otro servicio de notificaciones paralelo.

Después del commit, AvisosComunicados.crear utiliza el contrato de H28: destinatario {tipo, id}, tipoEvento COMUNICADO_NUEVO, título «Nuevo comunicado», mensaje con el título publicado, moduloOrigen COMUNICADOS, referenciaId y claveEvento COMUNICADO_NUEVO:{id}. Si no está conectado, lanza un error que se registra; el comunicado queda publicado. El criterio de entrega real de avisos sigue pendiente de H28. Las pruebas inyectan un doble, verifican el contrato y que el commit ya terminó, e incluyen un fallo deliberado.

## Verificación y antecedentes

Pruebas HTTP propias: permisos, validación, destinos inexistentes, duplicados por múltiples unidades, exclusión de inactivos, audiencia y cantidad de previa, publicación persistente ante fallo del aviso, inmutabilidad por API, paginación y lecturas. Frontend: validaciones, contador, selección de destino, confirmación sin publicación prematura, error sin pérdida de datos.

Correcciones previas aisladas en commits separados: tipos faltantes en paquetería, discriminación de su respuesta, fecha nullable en votaciones y eliminación de any en formulario de asambleas; corregían errores ya presentes en develop que bloqueaban typecheck/build. Backend: tipado object de cuerpos HTTP en la prueba H10, sin cambiar comportamiento.

Migraciones probadas desde una base PostgreSQL 18 vacía. Prisma diff muestra únicamente los cinco defaults UUID heredados de asambleas/votos: sus SQL usan gen_random_uuid() mientras el schema declara uuid(); no hay diferencias en Comunicado/LecturaComunicado. No se alteraron estos defaults ajenos.

H24 requiere integrar H23 primero; sus PR se encadenan a esta rama para que el diff muestre únicamente lectura/consulta. Al fusionar H23 deben retargetearse a develop. Yael (Yael2222) es el revisor solicitado. No hay merges automáticos ni cambios de estado en Jira.
