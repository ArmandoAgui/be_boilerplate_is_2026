# Hotfix 1.0.1: reservas

Rama de origen: `main`. Versión propuesta: `1.0.1`.

- Permitir al administrador rechazar solicitudes pendientes con motivo.
- Permitir al residente retirar del listado canceladas, rechazadas o finalizadas, conservando el historial y la regla de cancelación de 24 horas.

## Git Flow y publicación

1. Aprobar y fusionar el PR de esta rama hacia `main`.
2. Aprobar y fusionar el PR de retorno hacia `develop`; conservar allí las pruebas y cambios que no corresponden a producción.
3. Crear la etiqueta `v1.0.1` y su Release sobre el commit integrado en `main`. No mover etiquetas ya publicadas.
4. Publicar backend y frontend coordinadamente desde sus respectivos SHA de `main`, respaldando los datos y aplicando antes las migraciones del backend.
5. Comprobar salud, login, rechazo con motivo y eliminación del listado.

Las etiquetas, Releases y AWS quedan pendientes de la integración aprobada. La numeración de ambos repositorios es independiente (backend 1.0.1; frontend 1.0.3).

Detalle funcional, migraciones y pruebas: [decisión técnica](decisiones/2026-11-23-rechazo-eliminacion-reservas.md).
