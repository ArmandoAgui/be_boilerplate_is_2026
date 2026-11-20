# Modelo de datos

Fuente: [schema.prisma](../prisma/schema.prisma). IDs UUID; importes Decimal USD; fechas de negocio en America/El_Salvador y timestamps UTC. Las migraciones preservan historial.

## Diagrama entidad-relación

```mermaid
erDiagram
    User {
        string id
        string email
        string passwordHash
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }
    RefreshToken {
        string id
        string tokenHash
        string userId
        datetime expiresAt
        datetime revokedAt
        datetime createdAt
    }
    User ||--o{ RefreshToken : relacion
    Torre {
        string id
        string nombre
    }
    Seccion {
        string id
        string nombre
        string torreId
    }
    Torre ||--o{ Seccion : relacion
    Unidad {
        string id
        string codigo
        string torreId
        string seccionId
        decimal cuotaMensual
        boolean activa
    }
    Torre ||--o{ Unidad : relacion
    Seccion ||--o{ Unidad : relacion
    UsuarioUnidad {
        string id
        string userId
        string unidadId
    }
    User ||--o{ UsuarioUnidad : relacion
    Unidad ||--o{ UsuarioUnidad : relacion
    AreaComun {
        string id
        string nombre
        int capacidad
        boolean activa
        datetime createdAt
        datetime updatedAt
    }
    HorarioArea {
        string id
        string areaId
        int diaSemana
        string horaInicio
        string horaFin
    }
    AreaComun ||--o{ HorarioArea : relacion
    Reserva {
        string id
        string codigo
        string areaId
        string unidadId
        string userId
        datetime inicio
    }
    AreaComun ||--o{ Reserva : relacion
    Unidad |o--o{ Reserva : relacion
    User ||--o{ Reserva : relacion
    AutorizacionVisita {
        string id
        string residenteId
        string unidadId
        string visitanteNombre
        string visitanteDocumento
        datetime inicio
    }
    User ||--o{ AutorizacionVisita : relacion
    Unidad ||--o{ AutorizacionVisita : relacion
    Cuota {
        string id
        string unidadId
        string concepto
        string periodo
        decimal monto
        datetime fechaVencimiento
    }
    Unidad ||--o{ Cuota : relacion
    Pago {
        string id
        int numero
        string referencia
        string cuotaId
        string userId
        decimal monto
    }
    Cuota ||--o{ Pago : relacion
    User ||--o{ Pago : relacion
    Incidencia {
        string id
        string codigo
        string residenteId
        string lugarTipo
        string unidadId
        string areaId
    }
    User ||--o{ Incidencia : relacion
    User |o--o{ Incidencia : relacion
    Unidad |o--o{ Incidencia : relacion
    AreaComun |o--o{ Incidencia : relacion
    EvidenciaIncidencia {
        string id
        string incidenciaId
        string ruta
        string mime
        int tamanoBytes
        datetime createdAt
    }
    Incidencia ||--o{ EvidenciaIncidencia : relacion
    HistorialIncidencia {
        string id
        string incidenciaId
        string campo
        string valorAnterior
        string valorNuevo
        string actorId
    }
    Incidencia ||--o{ HistorialIncidencia : relacion
    User ||--o{ HistorialIncidencia : relacion
    MovimientoVisita {
        string id
        string autorizacionId
        string unidadId
        string visitanteNombre
        string visitanteDocumento
        string condicion
    }
    AutorizacionVisita |o--o{ MovimientoVisita : relacion
    Unidad ||--o{ MovimientoVisita : relacion
    User ||--o{ MovimientoVisita : relacion
    User |o--o{ MovimientoVisita : relacion
    Asamblea {
        string id
        string titulo
        datetime fechaAt
        string descripcion
        string estado
        string creadorId
    }
    User ||--o{ Asamblea : relacion
    TemaVotacion {
        string id
        string asambleaId
        string pregunta
        datetime aperturaAt
        datetime cierreAt
        boolean notificadoApertura
    }
    Asamblea ||--o{ TemaVotacion : relacion
    OpcionVoto {
        string id
        string temaId
        string texto
    }
    TemaVotacion ||--o{ OpcionVoto : relacion
    ParticipacionVoto {
        string id
        string temaId
        string unidadId
        string opcionId
        datetime createdAt
    }
    TemaVotacion ||--o{ ParticipacionVoto : relacion
    Unidad ||--o{ ParticipacionVoto : relacion
    OpcionVoto |o--o{ ParticipacionVoto : relacion
    Voto {
        string id
        string temaId
        string opcionId
    }
    TemaVotacion ||--o{ Voto : relacion
    OpcionVoto ||--o{ Voto : relacion
    Paquete {
        string id
        string codigo
        string unidadId
        string empresa
        string descripcion
        datetime recibidoAt
    }
    Unidad ||--o{ Paquete : relacion
    User ||--o{ Paquete : relacion
    User |o--o{ Paquete : relacion
    Comunicado {
        string id
        string titulo
        string contenido
        string alcance
        string torreId
        string seccionId
    }
    Torre |o--o{ Comunicado : relacion
    Seccion |o--o{ Comunicado : relacion
    User ||--o{ Comunicado : relacion
    LecturaComunicado {
        string id
        string comunicadoId
        string userId
        datetime leidoAt
    }
    Comunicado ||--o{ LecturaComunicado : relacion
    User ||--o{ LecturaComunicado : relacion
    Notificacion {
        string id
        string userId
        string moduloOrigen
        string tipoEvento
        string titulo
        string mensaje
    }
    User ||--o{ Notificacion : relacion
    PreferenciaDirectorio {
        string userId
        boolean visible
        boolean mostrarTelefono
        boolean mostrarCorreo
        boolean mostrarUnidad
        datetime updatedAt
    }
    User ||--o{ PreferenciaDirectorio : relacion
    AuditoriaAdministrativa {
        string id
        string actorId
        string recurso
        string recursoId
        string accion
        string motivo
    }
    User ||--o{ AuditoriaAdministrativa : relacion
```

## Tablas

| Modelo / tabla | Propósito | Campos principales |
|---|---|---|
| User / users | Identidad, hash de contraseña, rol y estado activo. | id, email, passwordHash, isActive, createdAt, updatedAt |
| RefreshToken / refresh_tokens | Sesiones renovables, expiración y revocación. | id, tokenHash, userId, expiresAt, revokedAt, createdAt |
| Torre / Torre | Torres del condominio. | id, nombre |
| Seccion / Seccion | Secciones pertenecientes a una torre. | id, nombre, torreId |
| Unidad / Unidad | Unidad habitacional y catálogo. | id, codigo, torreId, seccionId, cuotaMensual, activa |
| UsuarioUnidad / UsuarioUnidad | Asociación N:M entre residentes y unidades. | id, userId, unidadId |
| AreaComun / AreaComun | Áreas reservables, capacidad y estado. | id, nombre, capacidad, activa, createdAt, updatedAt |
| HorarioArea / HorarioArea | Franjas semanales de cada área. | id, areaId, diaSemana, horaInicio, horaFin |
| Reserva / Reserva | Solicitud personal, intervalo y ciclo pendiente/confirmada/cancelada. | id, codigo, areaId, unidadId, userId, inicio |
| AutorizacionVisita / AutorizacionVisita | Autorización vinculada al residente y unidad, con vigencia. | id, residenteId, unidadId, visitanteNombre, visitanteDocumento, inicio |
| Cuota / Cuota | Cuota por unidad/período, recargo y pago/anulación. | id, unidadId, concepto, periodo, monto, fechaVencimiento |
| Pago / Pago | Resultado simulado, idempotencia y últimos cuatro dígitos. | id, numero, referencia, cuotaId, userId, monto |
| Incidencia / incidencias | Reporte privado, lugar, prioridad, estado y responsable. | id, codigo, residenteId, lugarTipo, unidadId, areaId |
| EvidenciaIncidencia / evidencias_incidencia | Metadatos de foto privada; archivo en volumen. | id, incidenciaId, ruta, mime, tamanoBytes, createdAt |
| HistorialIncidencia / historial_incidencia | Cambios con actor, fecha y valores. | id, incidenciaId, campo, valorAnterior, valorNuevo, actorId |
| MovimientoVisita / MovimientoVisita | Entrada y salida; índice parcial impide dos ingresos abiertos. | id, autorizacionId, unidadId, visitanteNombre, visitanteDocumento, condicion |
| Asamblea / asambleas | Convocatoria y publicación. | id, titulo, fechaAt, descripcion, estado, creadorId |
| TemaVotacion / temas_votacion | Pregunta y ventana de votación. | id, asambleaId, pregunta, aperturaAt, cierreAt, notificadoApertura |
| OpcionVoto / opciones_voto | Opciones de cada tema. | id, temaId, texto |
| ParticipacionVoto / participaciones_voto | Una participación por unidad y tema; opción auditable en votos nuevos. | id, temaId, unidadId, opcionId, createdAt |
| Voto / votos | Conteo por opción; históricos no se vinculan retroactivamente. | id, temaId, opcionId |
| Paquete / Paquete | Recepción, entrega, residente que retira y corrección/anulación. | id, codigo, unidadId, empresa, descripcion, recibidoAt |
| Comunicado / Comunicado | Publicación inmutable y segmentación. | id, titulo, contenido, alcance, torreId, seccionId |
| LecturaComunicado / LecturaComunicado | Tabla histórica de lecturas; el flujo vigente no registra confirmaciones. | id, comunicadoId, userId, leidoAt |
| Notificacion / notificaciones | Aviso interno por residente con clave de evento idempotente. | id, userId, moduloOrigen, tipoEvento, titulo, mensaje |
| PreferenciaDirectorio / preferencias_directorio | Visibilidad y campos autorizados por residente. | userId, visible, mostrarTelefono, mostrarCorreo, mostrarUnidad, updatedAt |
| AuditoriaAdministrativa / AuditoriaAdministrativa | Motivo, actor, recurso y valores antes/después de correcciones. | id, actorId, recurso, recursoId, accion, motivo |

El diagrama resume las cardinalidades; índices únicos, columnas opcionales y restricciones exactas se consultan en el esquema y en prisma/migrations. No almacenar PAN/CVV ni contraseñas en texto plano.
