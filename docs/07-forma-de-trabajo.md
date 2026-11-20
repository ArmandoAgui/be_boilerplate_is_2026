# Forma de trabajo

Tablero: https://infsoftwareuca.atlassian.net/jira/software/projects/KAN/boards

## Git Flow

- main: versión publicada, recibida desde release/* o hotfix/*; su pareja de SHA coincide con el manifiesto desplegado.
- develop: integración del equipo.
- feature/<ID>-<descripcion>: desarrollo por historia, por ejemplo feature/H5-disponibilidad.
- bugfix/<ID>-<descripcion>: defectos encontrados en pruebas.
- release/1.0.0: estabilización final desde develop; PR hacia main y vuelta a develop.
- hotfix/<descripcion>: corrección desde main a main/develop, nueva versión de parche.

## Commits y PR

Convención: `<tipo>(<ID>): descripción`, tipos feat, fix, test, docs, chore. Cada PR explica problema y comportamiento, referencia la tarjeta y dependencias de frontend/backend, migraciones y comprobaciones reales. Otro integrante con acceso de escritura revisa y aprueba el head vigente. Resolver conversaciones después de corregir y verificar, sin desactivar protecciones ni autoaprobar PR propios.

El historial anterior contiene ramas de módulo e integraciones compartidas en lugar de un PR por historia, y títulos/commits sin ID consistente. Se conserva ese historial; docs/08-historias.md enlaza PR originales y consolidación. No se reescriben commits publicados para simular trazabilidad previa. La CI remota sigue siendo temporal (formato/JSON); no equivale a las suites funcionales locales.

## Definición de terminado

Criterios aceptados, PR revisado/fusionado a develop, inclusión en main v1.0.0 y funcionamiento desplegado. Actualizar card a Hecho/Finalizado con PR cuando corresponda; los estados Jira pendientes se muestran sin cambiarlos automáticamente por la documentación. El plan de pruebas ejecutado se entrega por separado hasta el 22/11/2026; no confundir checks de arranque con aceptación completa.
