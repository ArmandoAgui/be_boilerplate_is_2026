# Planificación integral: resumen ejecutivo

> Edición para revisión en el fork, publicada por solicitud posterior del equipo. La arquitectura, estimaciones y asignaciones siguen siendo propuestas. Las referencias a conservación local, ausencia de commits/push y «esta ejecución» describen la etapa de planificación anterior; esta publicación posterior incorpora la documentación sin modificar aplicación ni protecciones.

**Estado:** planificación propuesta, no implementación ni decisiones aprobadas. **Alcance confirmado por el equipo:** diez módulos más adaptación de autenticación; cinco integrantes; cuatro semanas.

## Alcance y estado

**Confirmado por el equipo:** cinco integrantes desarrollarán los diez módulos del Proyecto 1 más integración/adaptación de autenticación en cuatro semanas. La documentación anterior que lo limitaba a un módulo se corrige. El reparto general de diez equipos del PDF queda como D-01, aclaración con cátedra; no reduce la planificación.

**HV del análisis previo:** backend NestJS 12/TypeScript 6/Prisma 7/PostgreSQL 18; frontend Next.js 16.3.6/React 19.2.8/TypeScript/Tailwind 4. Existen registro, login, refresh, logout y me en API, health y dos modelos User/RefreshToken. El frontend ya hace login mediante Server Action y cookie. No existen los diez módulos de negocio, roles o pertenencia.

**Atención inmediata:** API_URL/prefijo/puertos no coinciden; cookie 7 días conserva solo access token de 15m y no renueva/revoca backend; roles ausentes; rotación refresh susceptible a carrera por lectura; entorno no ejecutado y pruebas limitadas. Los hallazgos completos permanecen en [guía técnica](guia-tecnica-y-backlog-condominios.md).

## Plan propuesto

Conservar monolito modular, Nest/Next/Prisma/PostgreSQL y Compose provisto. Definir C0 contexto usuario-unidad N:M, C1 sesión/permisos y C2 contratos antes de integrar los cinco frentes. Cada módulo mantiene controller/service/repository/DTO, permisos de recurso, persistencia y pruebas; M9 se construye temprano por contrato y M10 consume datos reales después.

Se identifican **26 casos de uso oficiales, 29 RF, 41 historias esenciales** y tres opcionales fuera del compromiso. Matriz RF→CU→CA→PR→HU en [requerimientos](01-alcance-y-requerimientos.md). Las pruebas propuestas no están implementadas ni ejecutadas.

**Estimación base 392 h-persona**, más 98 h de reserva: **490 h efectivas**. Con 35 h/persona/semana y 75% efectivo hay 525 h y solo 35 h de margen; con 25 h hay 375 h y déficit de 115 h. Es viabilidad condicionada, no promesa. Aprobar mecanismo de pago/medio de compartir/tiempo real y medir disponibilidad antes de comprometer fechas.

## Hitos de cuatro semanas

S1 bases, contratos, sesión/permisos, notificación común y primer recorrido; S2 funciones tempranas en paralelo y fuentes iniciales; S3 pagos/periodicidad, exclusión de reservas, asignación/seguimiento, votaciones, avisos completos y reportes reales; S4 aceptación, corrección, despliegue y evidencia. Reservas/votos/paquetes/privacidad se prueban antes de aceptación; no sustituir casos obligatorios por pantallas simuladas.

## Organización propuesta

Armando M1/M8, Heber M2/M7, Guille M6/M10, Serrato M3/M9 y Yael M4/M5, con apoyo por especialidad, revisión cruzada y reasignaciones de ejecución por etapa para evitar cuellos. Cada dueño integra y prueba; ni Armando ni Yael absorben todo. Reparto sujeto a disponibilidad y aprobación de los cinco; [RACI](07-distribucion-equipo.md).

## Lo que debe aprobarse primero

Capacidad, reparto e hitos; pertenencia/roles y representación; sesión; mecanismos mínimos que cumplen pago, generación periódica, tiempo real, comunicación/entrega y compartir reportes; contratos de M9/M10; reglas de migración/revisión y demo. [Agenda de 90 minutos](12-agenda-primera-reunion.md) prioriza acuerdos sobre lectura de documentos.

## Entrega de esta planificación y Git

Archivos nuevos locales en documentacion, fuera de repositorios: no se publican con los forks. Se corrigen Markdown de análisis en la rama compatible docs/analisis-inicial de ambos clones, sin commit/push ni cambios de protecciones. Main/HEAD/remotos/hooks conservados; no se toca aplicación, dependencias, Prisma o migraciones. No se crean PR, workflows, colaboradores o tercer repositorio. La publicación futura se propone en [estrategia GitHub](09-estrategia-github.md), condicionada a destino/protecciones y autorización específica.
