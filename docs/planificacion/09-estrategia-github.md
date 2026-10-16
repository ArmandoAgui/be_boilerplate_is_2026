# Estrategia propuesta de GitHub y colaboración

> Edición para revisión en el fork, publicada por solicitud posterior del equipo. La arquitectura, estimaciones y asignaciones siguen siendo propuestas. Las referencias a conservación local, ausencia de commits/push y «esta ejecución» describen la etapa de planificación anterior; esta publicación posterior incorpora la documentación sin modificar aplicación ni protecciones.

**Estado:** planificación propuesta, no implementación ni decisiones aprobadas. **Alcance confirmado por el equipo:** diez módulos más adaptación de autenticación; cinco integrantes; cuatro semanas.

## Estado verificado local y alcance de la propuesta

Los dos clones están en `docs/analisis-inicial`, rama compatible con el hook existente. origin apunta a ArmandoAgui; upstream lee nrecinos2001 y su URL de push es `disabled://upstream-read-only`. `core.hooksPath=.git/protection-hooks`; el hook solo permite la rama docs/analisis-inicial al fork exacto. `remote.pushDefault=origin`, `push.default=simple` y main con pushRemote disabled complementan la protección.

En esta ejecución solo se corrigen Markdown dentro de docs y se generan archivos locales en documentacion. **No hay commit, push, PR, merge, colaboradores, reglas remotas ni workflows nuevos.** No se consultó un nuevo estado remoto de reglas del servidor: esta afirmación sobre protecciones es local. Tampoco se cambia el hook para permitir docs/planificacion-integral.

## Flujo propuesto para cinco personas

Usar ramas de vida corta desde main del fork para historias, evitando una rama develop permanente salvo necesidad demostrada. Ejemplos de convención futura: `feat/m02-hu-02-002-reserva`, `fix/m09-avisos-duplicados`, `docs/planificacion-integral`. Estos nombres son propuestas; el hook actual no permite publicarlos hasta una modificación explícitamente autorizada de protecciones. No eludirlo con `--no-verify` o push por otro medio.

Commits: `feat(m02): ...`, `fix(auth): ...`, `test(m06): ...`, `docs: ...`. Asociar HU/RF y PR relacionado del otro repositorio en cuerpo del commit/PR cuando aplique. No poner credenciales o .env. PR internos siempre con base `ArmandoAgui/...`, nunca nrecinos2001. Integración a main solo por PR revisado cuando el equipo autorice ese flujo; ningún commit/push directo o merge automático en esta tarea.

## Condiciones propuestas para aceptar un PR

- Problema, HU/RF/CA y comportamiento explicados; diff acotado y dependencias claras.
- Dueño y revisor distintos; segundo revisor si afecta datos compartidos, permisos o transacciones.
- Contratos compatibles y enlace a PR backend/frontend cuando cambia el flujo completo; no presentar una mitad como funcionalidad terminada.
- Validación de entradas, roles, recurso/ámbito y errores cubierta; pruebas relevantes pasan con evidencia.
- Restricciones/migración revisadas y actualización desde estado previo comprobada en desarrollo; sin editar una migración ya compartida/aplicada.
- Build/lint/test pertinentes, documentación y ausencia de secretos; no aceptar pruebas fallidas como aprobadas.
- Resolución explícita de observaciones y permisos de destino verificados. La decisión de integrar la toma el flujo aprobado del equipo, no esta documentación.

## Conflictos y cambios coordinados

Actualizar rama con cambios revisados del fork según convención acordada, conservando trabajo local. Para principiantes se propone merge de main a rama de tarea cuando sea necesario para resolver conflictos, sin force-push ni reescritura de historia compartida; hacerlo manualmente con revisión y repetir checks. No usar reset hard para limpiar trabajo. Si hay cambios locales, preservarlos antes de cualquier operación.

No mezclar actualización desde la cátedra con desarrollo del módulo. upstream permanece lectura: fetch y comparación primero, decidir compatibilidad y traer cambios a una rama del fork mediante revisión. Nunca push upstream, PR a cátedra o permisos de escritura sobre su repo.

Prisma: un dueño lógico revisa la secuencia, pero cada historia escribe su migración con apoyo. Reservar cambios de entidades compartidas para evitar dos ramas creando estructuras incompatibles; acordar orden y probar aplicación conjunta. No retocar archivos de migración que otro ya aplicó; corregir con una nueva migración revisada. No ejecutar migraciones en esta planificación.

## Sincronizar backend y frontend

Una tarjeta HU puede enlazar dos PR. Definir contrato antes de trabajar en paralelo y mantener ejemplos no sensibles. Preferir cambios compatibles o un despliegue coordinado; no apuntar una UI a un endpoint que no existe en el entorno de demo. Contract tests y un recorrido real en la integración verifican ambos extremos; las capturas solas no prueban persistencia o permisos.

## CI propuesta, sin crear workflows

Backend: versión Node acordada, instalación por lock, generación Prisma sin exponer secretos, build, lint, tests y pruebas de integración con PostgreSQL aislado. Frontend: instalación por lock, lint, comprobación de tipos/build según scripts y pruebas de recorrido aprobadas. Validar variables necesarias y fuentes de next/font para que el build sea reproducible. Los checks deben reflejar scripts/entorno reales; no inventar un script test frontend existente.

No publicar variables de producción en logs/fixtures. Cada PR declara qué se ejecutó y qué no. Proponer protección de main con revisión y checks una vez el equipo lo apruebe y verifique permisos del fork; no configurar nada ahora.

## GitHub Projects propuesto, sin crear tablero ni tarjetas

Un tablero compartido para los dos forks con campos: HU, épica/módulo, RF, dueño, revisor, prioridad, horas estimadas/restantes, semana, bloqueo, PR backend/frontend y evidencia CA/PR. Estados: Propuesto → Listo → En curso → En revisión → Integrado → Verificado; Bloqueado como campo visible. Limitar cada persona a una historia activa y una revisión, ajustar según capacidad.

Importar únicamente historias aprobadas de 06-backlog-general.md y enlazar dependencias; no contar integración de UI y API como dos historias terminadas si el criterio es un único flujo. Revisar capacidad y desvíos varias veces por semana, manteniendo P2 fuera del compromiso.

## Incorporar documentación aprobada al fork: pasos futuros

1. Revisar y aprobar estos documentos locales; conservar guía técnica y evitar copias divergentes. Decidir repositorio canónico: propuesta backend `docs/planificacion/`, con índice/enlace desde frontend. No crear un tercer repositorio.
2. Comprobar status, main/HEAD, ramas y todas las URL de fetch/push en ambos clones; preservar modificaciones locales de esta ejecución. Confirmar acceso/owner del fork y destino exacto.
3. Si se elige `docs/planificacion-integral`, detener publicación y solicitar autorización explícita antes de modificar hook/configuración para admitir esa rama. El hook actual la bloquea. No se solicita esa autorización ahora porque no se publica nada.
4. Alternativa compatible: conservar `docs/analisis-inicial` y, tras revisión, incorporar allí Markdown. No publicar silenciosamente las correcciones locales ni asumir que esta alternativa fue aprobada para push.
5. Revisar únicamente docs, referencias y secretos; decidir commit/branch/revisión. Después de autorización de publicación y verificación de destino/protecciones, se podría publicar exclusivamente la rama del fork. No abrir ni fusionar PR automáticamente.

Estar fuera de los repositorios significa que documentacion no llega a GitHub con el push de ninguno de ellos. La propuesta anterior no constituye publicación ni cambio de protección.
