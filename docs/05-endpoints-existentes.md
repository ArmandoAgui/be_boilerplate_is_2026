# Inventario de endpoints existentes

Base HTTP configurada: `http://localhost:3000/api/v1` en [main.ts](../src/main.ts), con puerto configurable. Se identificaron seis handlers HTTP en tres controllers. Los métodos de repositorios no constituyen endpoints.

## Rutas y contratos

| Método y ruta completa | Controller → service | Entrada | Respuesta de éxito | Autenticación / roles |
|---|---|---|---|---|
| GET `/api/v1` (raíz del prefijo) | HealthController.getHello → HealthService.getHello | Ninguna | 200, texto `Hello World!` | Público; sin roles |
| POST `/api/v1/users` | UsersController.create → UsersService.create | CreateUserDto: email, password | 201, UserResponseDto | Público; sin roles |
| POST `/api/v1/auth/login` | AuthController.login → AuthService.login → TokenService.issueTokenPair | LoginDto: email, password | 200, AuthResponseDto | Público; sin roles |
| POST `/api/v1/auth/refresh` | AuthController.refresh → AuthService.refresh → TokenService.rotate | RefreshTokenDto: refreshToken | 200, AuthResponseDto; tokens nuevos | Público respecto al guard JWT; exige refresh válido; sin roles |
| POST `/api/v1/auth/logout` | AuthController.logout → AuthService.logout → TokenService.revoke | RefreshTokenDto: refreshToken | 204, sin cuerpo | Público respecto al guard JWT; revocación idempotente; sin roles |
| GET `/api/v1/auth/me` | AuthController.me; identidad cargada por JwtAuthGuard → UsersService.findById | Header Authorization: Bearer | 200, UserResponseDto | JWT y usuario activo; ningún rol restringido |

Fuentes: [HealthController](../src/health/controllers/health.controller.ts), [UsersController](../src/users/controllers/users.controller.ts), [AuthController](../src/auth/controllers/auth.controller.ts), [guard](../src/auth/guards/jwt-auth.guard.ts), [TokenService](../src/auth/services/token.service.ts).

## DTOs de entrada

- [CreateUserDto](../src/users/dto/create-user.dto.ts): email normalizado de hasta 254 caracteres; password string de 8-72 caracteres, con minúscula, mayúscula y dígito.
- [LoginDto](../src/auth/dto/login.dto.ts): email normalizado; password string no vacío de hasta 72 caracteres.
- [RefreshTokenDto](../src/auth/dto/refresh-token.dto.ts): refreshToken string no vacío, sin validación adicional de formato ni longitud máxima.

Los cuerpos son JSON. [ValidationPipe](../src/main.ts) transforma DTOs y rechaza propiedades adicionales con 400. No se declararon query params, parámetros de ruta, paginación ni multipart en estos handlers.

## DTOs de salida

[UserResponseDto](../src/users/dto/user-response.dto.ts):

```json
{
  "id": "<uuid>",
  "email": "<email normalizado>",
  "isActive": true,
  "createdAt": "<fecha ISO serializada>"
}
```

[AuthResponseDto](../src/auth/dto/auth-response.dto.ts):

```json
{
  "accessToken": "<JWT>",
  "refreshToken": "<token opaco>",
  "expiresIn": 900,
  "user": {
    "id": "<uuid>",
    "email": "<email normalizado>",
    "isActive": true,
    "createdAt": "<fecha ISO serializada>"
  }
}
```

Son formas ilustrativas extraídas de los mapeadores, sin credenciales reales. 900 corresponde al default 15m, no a una constante del contrato: TokenService deriva expiresIn del JWT firmado. passwordHash, updatedAt y hashes de refresh no se devuelven en estos DTOs.

## Errores observables por lectura

| Ruta | Casos previstos por el código |
|---|---|
| users | 400 por DTO; 409 por email ocupado; errores no traducidos de persistencia pueden producir 500 |
| login | 400 por DTO; 401 genérico para credenciales inválidas/inactividad |
| refresh | 400 por DTO; 401 para token desconocido, expirado, revocado o usuario inactivo |
| logout | 400 por DTO; token desconocido o revocado sigue produciendo 204 |
| me | 401 por Bearer ausente, inválido o expirado, usuario inexistente o inactivo |

No hay lógica propia que produzca 403 por roles. Los mensajes de errores Nest dependen del caso; `message` puede ser una lista en validación. El texto Swagger de conflicto en UsersController aún dice nombre de usuario, mientras el contrato real usa email.

## Documentación y alcance

[main.ts](../src/main.ts) registra Swagger en `/api/docs`, con esquema Bearer. Es una ruta de documentación configurada aparte del inventario de seis handlers de negocio; no está protegida mediante un controller propio. Swagger registra también sus recursos de documentación, no enumerados como funcionalidades del dominio.

El health check devuelve texto y no consulta disponibilidad de PostgreSQL; no debe interpretarse como readiness completa de todas las dependencias. No existen endpoints de roles, condominios, unidades ni de los diez módulos. Esta revisión no hizo solicitudes contra un servidor ni generó evidencia de respuestas en ejecución.
