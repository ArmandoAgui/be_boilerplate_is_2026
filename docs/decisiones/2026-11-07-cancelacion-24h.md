# D-M2-02 — Cancelación con 24 horas de anticipación

Fecha: 07/11/2026. Fuente: aclaración del instructor compartida por el usuario; el usuario autorizó implementar este ajuste mientras consulta los puntos pendientes.

## Regla vigente

Una reserva CONFIRMADA solo puede cancelarse por su creador cuando falten **al menos 24 horas** para el inicio. El corte exacto está incluido. El cálculo compara instantes UTC (24 × 60 × 60 × 1000 ms), no días del calendario ni la zona horaria del navegador.

- API: mantiene actualización condicional por id/userId/estado e inicio >= ahora + 24h; fuera de plazo responde 409 y conserva estado/canceladaAt.
- UI: el botón Cancelar respeta el mismo corte; el mensaje indica las 24 horas. El servidor vuelve a comprobar el plazo al confirmar el diálogo.
- Se aplica también a reservas anteriores que sigan confirmadas. No modifica por anticipado reservas, fechas ni datos históricos.
- No cambia contratos, estados ni esquema: no requiere migración ni nuevas dependencias.

## Verificación

Backend: pruebas PostgreSQL de cancelación a menos de 24h, de 24h exactas y ±1 ms, además de autorización, liberación y doble cancelación. Frontend: helper en el límite, botón oculto para una reserva a 12h y error 409 sin cambiar el estado. Las reservas de los recorridos de navegador se programan para dentro de dos días, para poder cancelarlas a cualquier hora del día de prueba.

## Pendientes explícitos

El módulo aún confirma automáticamente y no bloquea por cuotas vencidas. No se implementan esas dos reglas en este ajuste: faltan aclaraciones sobre bloqueo/cupo de solicitudes pendientes y sobre la atribución de deuda al residente. El cupo por residente ya implementado se conserva.

## Integración

Este cambio parte de feature/modulo-02-reservas. El PR original #1 de cada repositorio continúa abierto; el PR nuevo hacia main depende de esa base. Integrar primero la base revisada y después este ajuste, sin merges automáticos. Mientras main no tenga el módulo, el diff completo incluye la base: el commit del nuevo PR identifica el cambio aislado. Revisores serán asignados manualmente por el usuario.
