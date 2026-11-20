# Problemas conocidos

| Problema | Cómo se reproduce | Impacto | Historia relacionada |
|---|---|---|---|
| Publicación 1.0.0 pendiente mientras los PR de release no estén aprobados/fusionados | Comparar main/develop y etiquetas antes del cierre | Alto para entrega formal | Todas |
| Swagger no accesible en el despliegue previo | GET /api/docs antes de activar el Caddy de esta release devuelve 404 | Alto; corregido en esta rama, pendiente de desplegar | API/documentación |
| Estados Jira desactualizados frente a integración | H11, H12, H27, H28 y H30 Por hacer; H18/H26 En revisión al 20/11 | Medio para trazabilidad; confirmar cierre con responsables | Historias indicadas |
| Fixtures compartidas entre suites HTTP | Interrumpir suite y repetir otras que cuentan residentes globales puede cambiar los conteos | Medio en pruebas; usar base aislada nueva, nunca resetear AWS | H10/H18/H23/H24/H28 |
| Mensaje genérico de recurso ajeno en comunicado | Abrir URL de comunicado de otra torre: 404 correcto, pero el texto genérico puede decir Área inexistente o inactiva | Bajo; privacidad preservada | H24 |
| Seed conserva fechas iniciales | Reejecutar días después mantiene reservas/vigencias previas | Bajo; permite conservar historial; crear datos nuevos por interfaz | Datos de prueba |
| Notificaciones solo internas | Registrar un evento y no se recibe correo | NiceToHave fuera del alcance implementado | H28 |
| Votos históricos no identificables | Auditar votos anteriores a la migración PO no permite reconstruir opción por unidad | Historial conservado; votos nuevos sí registran opción | H22 |
| Una sola VM, sin respaldo externo configurado | Perder EC2/EBS afectaría servicio y copias locales | Operativo; configurar/custodiar copia externa | Despliegue |
| Falta prueba de carga/ARM64 | La validación se hizo en amd64 y recorridos pequeños | Operativo; no se afirma capacidad productiva concurrente | Plataforma |

CI temporal de JSON/formato no sustituye la ejecución del plan de pruebas. El plan de aceptación ejecutado es un entregable separado. Los fallos de cuota/configuración, permisos de checkout, corrección de paquete y cambio de unidad ya fueron corregidos antes de esta release. Las dependencias de desarrollo conservan avisos de auditoría documentados en las integraciones; no se afirma auditoría integral de seguridad.
