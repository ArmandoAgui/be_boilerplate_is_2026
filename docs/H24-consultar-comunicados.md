# H24 — Consultar comunicados relevantes (KAN-121)

Fuente: Jira KAN-121, consultada 11/11/2026. Responsable: Armando. Depende de H23 y reutiliza Comunicado/LecturaComunicado sin una segunda migración ni modelos alternativos.

## Contrato

- GET /api/v1/comunicados/mios: solo Residente; página desde 1, tamaño 1–50 (predeterminado 10). Devuelve id, título, alcance, creadoAt y leido, total/página/tamaño. No incluye contenido completo ni identidades de lectores.
- GET /api/v1/comunicados/:id: solo Residente; devuelve el contenido y registra lectura. Recurso inexistente o dirigido a otra audiencia responde 404. UUID inválido/paginación/campos extra: 400. Sin sesión: 401; otros roles: 403.

El filtro usa la identidad del servidor y todas sus vinculaciones UsuarioUnidad. Une generales y torres/secciones de sus unidades mediante OR/EXISTS, sin duplicar comunicados. No confía en userId/torreId/seccionId de parámetros ni filtra por fecha de ingreso. Residentes sin unidades conservan acceso a los generales. No se agrega una restricción de unidad activa que la tarjeta no especifica.

## Lectura y privacidad

El listado no escribe lecturas. El detalle comprueba audiencia y hace upsert por clave única (comunicadoId,userId) en una transacción. Reabrir o acceder concurrentemente no altera la primera fecha ni duplica filas. No se registra lectura al pedir un recurso ajeno. El administrador ve conteos agregados mediante H23, no datos personales de lectores.

Las tarjetas deshabilitan el prefetch del enlace al detalle para que Next no registre una lectura especulativa antes de la navegación. El contenido se presenta como texto React con saltos de línea; no se interpreta HTML del comunicado. La API conserva el texto original. Fechas visibles en America/El_Salvador.

## Interfaz

/comunicados: tarjetas de título, fecha, alcance y Leído/Sin leer; diez por página, orden más reciente e id como desempate estable. Vacío exacto: «No hay comunicados para tu unidad». /comunicados/[id]: contenido completo, enlace para volver y not-found en un id inexistente o ajeno. Roles distintos ven Sin permiso sin consultar el detalle.

## Pruebas

HTTP/PostgreSQL: audiencias de varias torres y secciones homónimas, exclusión de otra sección por URL, ausencia de filtrado por fecha de ingreso, diez lecturas simultáneas, conservación de fecha de primera lectura, agregación administrativa, roles, parámetros manipulados, usuarios sin unidades, página vacía y orden/paginación estable. Componentes: tarjetas, paginación, vacío, estado leído y HTML inerte. Navegador: publicación y lectura de extremo a extremo en escritorio/móvil, actualización de X/N y exclusión de una torre ajena; permisos de pantallas.

H23 se integra primero. El PR de H24 apunta inicialmente a feature/h23-publicar-comunicados para mantener el diff limitado a H24; retargetear a develop tras integrar H23. Yael (Yael2222) debe revisar y aprobar. No se cambian estados de Jira ni se realiza merge automático.

La entrega real de notificaciones depende de H28, documentada explícitamente en H23; consultar comunicados y registrar lecturas no requiere ese servicio.

## Resultado local (11/11/2026)

- Backend: build/typecheck aprobados; 141 unitarias aprobadas. HTTP/PostgreSQL: 11 pruebas propias de H23/H24 aprobadas, incluidas diez lecturas simultáneas. Regresión con reservas y paquetería: 62/62 aprobadas.
- Frontend: 161 pruebas aprobadas (6 nuevas H23, 4 nuevas H24); typecheck, lint y build de producción aprobados. Se completó el mock usePathname de una prueba heredada de reservas que ya fallaba en develop.
- Chromium contra API/PostgreSQL y Next de producción: 3/3 escenarios aprobados (escritorio, móvil, permisos). Contenido con script almacenado permanece texto inerte y una lectura repetida no aumenta X/N.
- Lint backend sin errores; persiste una advertencia heredada en AsambleasService por spread de instancia. Prisma diff conserva solo la discrepancia heredada de cinco defaults UUID de asambleas/votos, sin deriva de los modelos nuevos. No se declara validación remota aprobada.
- Entorno aislado: PostgreSQL 18 en puerto 55441, bases terminadas en _test; ningún dato del servidor del usuario fue modificado.
