# SONNET 5 — Administración de condominio

Plataforma para un único condominio: cuotas y pagos, reservas, incidencias, visitas, paquetería, asambleas, comunicados, directorio, avisos y reportes. Los roles son Administrador, Residente y Seguridad; las asociaciones con unidades las realiza administración.

**Proyecto asignado:** Proyecto 1, SONNET 5. **Curso:** Ingeniería de Software, UCA, ciclo 02/2026, Sección 01.
**Versión preparada:** 1.0.0. La publicación requiere que los PR de release sean aprobados y fusionados a main; ver [despliegue](docs/06-despliegue.md).

## Ambiente desplegado

| Componente | URL |
|---|---|
| Frontend | https://sonnet5.98.81.166.66.sslip.io |
| Backend | https://sonnet5.98.81.166.66.sslip.io/api/v1 |
| Documentación de la API (Swagger) | https://sonnet5.98.81.166.66.sslip.io/api/docs |

Las rutas públicas de API/Swagger se incorporan en esta release; en el despliegue anterior Swagger devuelve 404 hasta activar esta configuración. Credenciales: entrega privada en Moodle, nunca en Git. Mantener el sistema y sus cuentas al menos hasta el 24/11/2026.

## Integrantes

| Nombre | Carnet | Usuario de GitHub | Módulos o historias principales |
|---|---|---|---|
| Fernando Yael Herrera Tamayo | 00038623 | [@Yael2222](https://github.com/Yael2222) | H19–H22, H25–H26 |
| Heber Josue Canales Henriquez | 00054621 | [@HC2003](https://github.com/HC2003) | H1–H4, H29–H30 |
| Diego Rafael Flores Serrato | 00029823 | [@DiegoFSerrato](https://github.com/DiegoFSerrato) | H13–H18 |
| Guillermo Alejandro Hernandez Dubon | 00106423 | [@guillermodubon](https://github.com/guillermodubon) | H9–H12, H27–H28 |
| Armando Antonio Aguilar Rosales | 00174323 | [@ArmandoAgui](https://github.com/ArmandoAgui) | H5–H8, H23–H24; integración y despliegue |

## Documentación

1. [Guía de uso](docs/01-guia-de-uso.md)
2. [Arquitectura](docs/02-arquitectura.md)
3. [Modelo de datos](docs/03-modelo-de-datos.md)
4. [API](docs/04-api.md)
5. [Instalación local](docs/05-instalacion-local.md)
6. [Despliegue](docs/06-despliegue.md)
7. [Forma de trabajo](docs/07-forma-de-trabajo.md)
8. [Historias por módulo](docs/08-historias.md)
9. [Problemas conocidos](docs/09-problemas-conocidos.md)

Documentación completa centralizada en este backend. [Repositorio frontend](https://github.com/ArmandoAgui/fe_boilerplate_is_2026). Las decisiones y guías históricas de módulos permanecen en docs; las nueve páginas anteriores son la entrada vigente de la entrega.

## Inicio local

Clonar ambos repositorios y ejecutar desde backend: `python3 deploy/local.py --frontend ../fe_boilerplate_is_2026 --build --seed`. Docker Compose V2, Buildx y Python 3 son necesarios. Abrir https://localhost:8443; certificado local y credenciales en [instalación](docs/05-instalacion-local.md).
