# Riesgos y recomendaciones para comenzar

Todos los puntos son hallazgos de lectura o propuestas; no se aplicaron correcciones al boilerplate. Prioridad alta significa resolver antes de depender del componente, no que se haya demostrado una explotación.

## Riesgos técnicos

| Prioridad | Hallazgo y evidencia | Efecto posible | Acción propuesta / comprobación futura |
|---|---|---|---|
| Alta | Sin roles ni pertenencia en [schema](../prisma/schema.prisma), [payload](../src/auth/types/auth.types.ts) o [guard](../src/auth/guards/jwt-auth.guard.ts) | Autenticación insuficiente para distinguir residente, administrador y seguridad o limitar datos por unidad | Acordar matriz de permisos y modelo de pertenencia; verificar denegación por rol y por recurso |
| Alta | Frontend `.env.example` usa 8000 sin prefijo; backend [main](../src/main.ts) usa 3000 y `/api/v1`; Next también usa 3000 por defecto | Login no llega al endpoint o servidores compiten por puerto | Acordar URLs y puertos para host, Compose y despliegue; probar la URL construida |
| Alta | Frontend `lib/session.ts` conserva cookie siete días; `app/actions/auth.ts` solo retiene access token; backend usa 15m por defecto | Página accesible con cookie aunque token haya expirado; sesiones sin renovación | Diseñar renovación y validación real del usuario; probar expiración y usuario inactivo |
| Alta | Logout frontend solo elimina cookie, mientras [TokenService](../src/auth/services/token.service.ts) revoca refresh | Sesiones de backend permanecen activas; access tokens siguen válidos hasta expirar | Definir logout completo y política de revocación; probar cliente y API |
| Alta | Rotación usa lectura → revokeById → issueTokenPair sin transacción ni consumo condicional ([TokenService](../src/auth/services/token.service.ts)) | Posible doble renovación concurrente, o pérdida de sesión ante fallo entre pasos | Evaluar consumo atómico y pruebas de concurrencia; coordinar una única renovación desde frontend |
| Alta | Solo hay pruebas de health y una e2e básica ([spec](../src/health/controllers/health.controller.spec.ts), [e2e](../test/app.e2e-spec.ts)) | Regresiones de autenticación o aislamiento no detectadas | Añadir pruebas de contratos, permisos y concurrencia en la fase de implementación |
| Media | Registro público ([UsersController](../src/users/controllers/users.controller.ts)); sin validación de pertenencia | Cuentas sin vínculo confiable a residentes o privilegios mal asignados en una futura extensión | Definir alta de residentes, invitaciones y asignación de roles por actor autorizado |
| Media | MaxLength(72) valida caracteres, no bytes ([CreateUserDto](../src/users/dto/create-user.dto.ts)) | Entradas multibyte podrían superar el límite efectivo de bcrypt | Revisar política UTF-8 y pruebas de contraseñas; no asumir que el comentario del DTO garantiza el límite |
| Media | [Migración email](../prisma/migrations/20260927163851_rename_username_to_email/migration.sql) normaliza datos existentes con índice único | Colisiones o antiguos nombres que no sean emails | Analizar datos y respaldo antes de ejecutar sobre bases pobladas |
| Media | No hay rate limiting ni controles de recuperación/verificación en módulos auth/users | Abuso de login o altas; operación incompleta de cuentas | Acordar controles según alcance y despliegue, conservando contrato común |
| Media | [Seed](../prisma/seed.ts) tiene usuario demo e imprime sus credenciales; [.env.example](../.env.example) contiene valores de ejemplo | Uso accidental de valores de desarrollo en un despliegue | Configurar secretos reales fuera de Git y excluir seed demo de producción |
| Media | No hay CORS configurado ([main](../src/main.ts)) | Llamadas directas navegador→API de otro origen requieren configuración | Mantener la distinción: login actual es servidor→servidor; decidir topología antes de habilitar CORS |
| Media | IDs de contenedores y nombre de Compose fijos ([Compose](../docker-compose.yml)); tags de imagen por familia | Colisiones entre entornos y distinta imagen con el tiempo | Coordinar entorno común, documentar versiones efectivas; cualquier cambio requerirá revisión posterior |
| Media | deleteExpired existe sin programador ([RefreshTokenRepository](../src/auth/repositories/refresh-token.repository.ts)) | Acumulación de tokens vencidos | Definir retención y responsable de limpieza |

No se encontró configuración CI versionada en `.github/workflows` en ninguno de los dos repositorios; no se inspeccionaron reglas externas o acciones configuradas desde GitHub. El entorno de esta sesión carece de Node/npm/Docker en PATH; las validaciones de ejecución y despliegue siguen pendientes.

## Riesgos del dominio que deben convertirse en decisiones

Estos riesgos derivan de los criterios de éxito del Proyecto 1 (PDF, páginas 4-6); todavía no corresponden a código implementado:

- **Reservas:** comprobar disponibilidad solo en frontend no evita dos reservas simultáneas; acordar intervalos, zona horaria y garantía de exclusión en persistencia.
- **Votaciones:** una restricción por usuario no satisface votar una vez por unidad. Definir quién representa la unidad y cómo se conserva evidencia del resultado.
- **Cuotas y pagos:** definir moneda, precisión decimal, conciliación e idempotencia antes de reportar saldos. No se exige en el PDF un proveedor específico ni cobro con tarjeta.
- **Directorio y visitas:** respetar opt-in de datos compartidos; separar facultades de seguridad y acceso residencial, con criterios de retención por acordar.
- **Incidencias y paquetes:** conservar estados e historial suficiente para trazabilidad; discutir evidencia de resolución/entrega y almacenamiento de fotos.
- **Notificaciones y reportes:** acordar eventos y definiciones compartidas; evitar construir cálculos y envíos incompatibles en cada módulo. El PDF no exige WebSockets, email o SMS en particular.

## Decisiones para la primera reunión

1. Confirmar módulo asignado y responsabilidad de integrar con los demás equipos. La plataforma completa es el contexto; no se impone implementarla toda por cinco personas.
2. Acordar identidad, roles, pertenencia a unidad y límites entre condominios si aplica; designar responsable del contrato compartido.
3. Elegir estrategia de sesión con Next y backend: validar usuario, renovar y revocar; decidir si el estado de UI necesita una biblioteca externa. Conservar Prisma y JWT inicialmente es una propuesta de menor alcance, no una obligación adicional de la cátedra.
4. Acordar puertos, API_URL con prefijo, entornos y despliegue; usar el Compose provisto, como exige el PDF.
5. Designar dueño de migraciones y responsables por interfaces; registrar decisiones de arquitectura y criterios de aceptación.
6. Confirmar nombres completos y responsabilidades para actualizar README más adelante; disponer de enlaces de forks y demo, como solicita la especificación. Esta ejecución añade únicamente documentos en docs.

## Flujo de trabajo propuesto

Mantener ramas por tarea dentro de los forks, PR internos y revisión cruzada; no abrir PR a la cátedra. Registrar decisiones en ADR breves cuando se aprueben, junto con contratos de entrada/salida y errores. Coordinar migraciones antes de fusionar y priorizar pruebas que protejan los criterios de éxito del módulo asignado.

Las protecciones actuales son locales a estos clones: `.git/config` limita el destino y `.git/protection-hooks/pre-push` solo autoriza la rama de documentación. Debe planificarse su adaptación a ramas de desarrollo y protección de main en GitHub; no se cambiaron reglas de servidor ni se añadieron colaboradores. El hook puede omitirse deliberadamente con herramientas de Git y no reemplaza los permisos del servidor.
