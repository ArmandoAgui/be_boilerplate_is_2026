# Riesgos, supuestos y decisiones pendientes

> Edición para revisión en el fork, publicada por solicitud posterior del equipo. La arquitectura, estimaciones y asignaciones siguen siendo propuestas. Las referencias a conservación local, ausencia de commits/push y «esta ejecución» describen la etapa de planificación anterior; esta publicación posterior incorpora la documentación sin modificar aplicación ni protecciones.

**Estado:** planificación propuesta, no implementación ni decisiones aprobadas. **Alcance confirmado por el equipo:** diez módulos más adaptación de autenticación; cinco integrantes; cuatro semanas.

## Estado de las decisiones

Todo en la tabla es **pendiente** excepto el alcance interno de diez módulos confirmado por el usuario. Una propuesta no se considera aprobada por estar escrita. El detalle técnico se conserva en la guía; esta tabla conecta riesgos con decisiones para la reunión.

| ID | Tema | Propuesta / evidencia actual | Por resolver | Responsabilidad propuesta | Límite objetivo | Implicación |
|---|---|---|---|---|---|---|
| D-01 | Alcance académico | El equipo confirma diez módulos; PDF general reparte módulos entre diez equipos | Consultar compatibilidad con cátedra sin reducir alcance | Armando coordina; cinco aprueban | S1 inicio | La planificación sigue completa mientras se aclara |
| D-02 | Roles y pertenencia | Propuesta: roles por condominio y relación usuario-unidad N:M | Altas, representación, vigencia, alcance multi-condominio y facultades finas | Guille + Yael y cinco | S1 antes C0/C1 | No asumir que cada unidad es un usuario |
| D-03 | Pagos y cuotas | Propone un medio aprobado y ejecución periódica idempotente | Qué constituye pagar/confirmar; moneda, parciales, recargos y mensualidad | Armando; cátedra para aceptación | S1 | Si proveedor obligatorio exige más, reestimar HU-01-002 |
| D-04 | Reservas | Propuesta [inicio,fin), exclusión real y capacidad | Ventanas, cancelación, cupo, zona horaria y mecanismo de exclusión | Heber + Guille | S1/S2 | No aceptar chequeo solo previo |
| D-05 | Incidencias y fotos | Propone almacenamiento autorizado e historial de estados | Asignables, estados, límites/retención y resolución verificable | Serrato + Yael | S1 | Fotos obligatorias; almacenamiento aún no elegido |
| D-06 | Visitas y presentes | Registrar autorizadas y no autorizadas; latencia de consulta acordada | Facultad de admisión, identidad mínima, reingreso/retención y significado de tiempo real | Yael + Armando; cátedra valida latencia | S1 | No exigir hardware o asumir que no autorizada se descarta |
| D-07 | Entrega de paquetes | Verificar receptor con evidencia mínima aprobada | Retiro por delegado, identidad, unicidad de referencia y devolución | Yael + Guille | S1/S2 | Entrega correcta obligatoria, firma digital opcional |
| D-08 | Voto y auditoría | Voto único unidad+tema con elegibilidad y resultado verificable | Representación, quorum, empate, secreto, apertura/cierre y acceso a evidencia | Guille + Heber; cátedra | S1 antes diseño voto | No introducir ponderaciones o exponer voto personal sin acuerdo |
| D-09 | Evidencia de comunicados | Publicación segmentada y evidencia; posible lectura/acuse | Qué satisface criterio de enterarse; edición y audiencia histórica | Heber + Armando; cátedra | S1/S2 | No prometer lectura humana con simple notificación |
| D-10 | Directorio | Opt-in y campos autorizados por ámbito | Campos de contacto, multunidad, visibilidad y caché | Armando + Serrato | S1/S2 | Rechazo de datos no consentidos en API |
| D-11 | Notificaciones | Bandeja interna, servicio común y reintentos idempotentes | Latencia, eventos, grupos, retención y fiabilidad ante fallo | Serrato + Heber | S1 contrato | Cuota por vencer, paquete y comunicado deben integrarse reales |
| D-12 | Reportes y compartir | Cuatro métricas y salida simple autorizada | Fórmulas de mora/ocupación/participación, corte y modalidad de compartir | Guille + dueños productores; cátedra | S1 contrato, S3 datos | No sustituir compartir por mostrar pantalla solo al admin |
| D-13 | Sesión | Mantener JWT backend y completar Next; consumo atómico refresh | Cookie refresh o sesión servidor, expiración, fallo/logout y concurrencia | Serrato + Heber | S1 | No añadir librería ni compartir secreto sin necesidad |
| D-14 | Capacidad y fechas | 392 h base, 98 h reserva; reparto y fechas ilustrativos | Disponibilidad real, fortalezas, calendario de sección, hosting y reparto | Los cinco; Armando registra | Primera reunión, revisar tras S1 | No presentar viabilidad incondicional ni fecha de Gantt como aprobada |

## Registro de riesgos

| Riesgo | Probabilidad / impacto propuestos | Evidencia o causa | Mitigación y vínculo | Señal de escalamiento |
|---|---|---|---|---|
| RI-01 Capacidad insuficiente | Alta / alto | Disponibilidad desconocida; 490 h referencia | D-14, medir horas y recalibrar semanalmente; preservar alcance | Menos de ~33 h disponibles/persona/semana al supuesto 75% |
| RI-02 Sesión y permisos incompletos | Alta / alto | HV: cookie no verifica JWT; no roles/pertenencia | HU-T-03/04/05, PR-S-04/05/08 | Base no demostrable al cierre S1 |
| RI-03 Contradicción de organización académica | Media / alto | PDF diez equipos vs alcance comunicado | D-01, preguntar sin suspender plan de diez módulos | Cátedra exige flujo de reparto distinto |
| RI-04 Complejidad de pago no definida | Alta / alto | No proveedor/medio elegido ni servicio actual | D-03; aprobar mecanismo, reestimar antes de integrar | Exigencia de pasarela/sandbox/certificación no contemplada |
| RI-05 Concurrencia de reservas/votos/pagos/refresh | Alta / alto | Reglas centrales; refresh actual no atómico | HU-02-002, HU-06-002, HU-01-002/004, HU-T-05; pruebas BD reales | Doble escritura o resultado no reproducible |
| RI-06 Reportes y avisos quedan como pantallas vacías | Media / alto | Dependen de productores de dominio | Contrato temprano HU-T-07/HU-09-002, I posteriores verificadas S3 | Fixtures siguen siendo única fuente al final S3 |
| RI-07 Exposición de datos | Media / alto | Directorio, visitas, pagos, votos y archivos comparten identidades | D-02/05/06/08/10; PR-S-04/07/12/13 | Cualquier consulta ajena retorna dato sensible |
| RI-08 Mecanismo mínimo no aceptado por cátedra | Media / alto | Tiempo real, evidencia de anuncio, compartir y pago requieren concreción | D-03/06/09/12 antes de cerrar MVP | Respuesta exige complejidad adicional sin capacidad |
| RI-09 Migraciones incompatibles | Media / alto | Cinco desarrolladores, esquema compartido | Dueños por dominio, revisión cruzada, secuencia y pruebas desarrollo | Dos ramas modifican cardinalidad compartida sin acuerdo |
| RI-10 Entorno/despliegue tarde | Alta / alto | PATH sin Node/npm/Docker en revisión; URLs no coinciden | HU-T-01/08 y demo temprano | No hay primer entorno reproducible en S1 |
| RI-11 Concentrar integración o QA | Media / alto | Organización por capas puede generar colas | Estrategia híbrida y pruebas por dueño/revisor | Una persona tiene todos los PR pendientes |
| RI-12 Publicación indebida | Baja / alto | Hook solo rama docs; originales lectura | No tocar protección ni publicar en esta fase; propuesta de Git explícita | Destino, owner o permiso no verificable |

## Hallazgos técnicos que se mantienen

Sin cambios en código: roles ausentes; discrepancia API_URL/prefijo/puertos; cookie 7 días vs access 15m, refresh descartado/logout local; rotación no atómica por lectura; dos modelos y dos migraciones, sin dominio; pruebas existentes limitadas. También siguen vigentes riesgos de bcrypt caracteres/bytes, normalización histórica de email, seed demo y falta de limpieza programada/rate limiting/CORS según topología descritos en la guía. No se repite análisis desde cero ni se declara que se corrigieron.

## Política ante sobrecarga o contradicción

Conservar casos obligatorios. Simplificar interfaz/implementación sin eliminar pago, generación periódica, fotos, visitas no autorizadas, entrega correcta, voto único/auditable, segmentación/privacidad, avisos o compartir reportes. Si no cabe, presentar capacidad y estimación a cátedra para decisión explícita de tiempo/recursos/aceptación. Registrar decisión con fecha, autor y efecto en RF/HU/prueba; no convertir silencio en aprobación.
