# Edición compartida en Windows y Linux

El equipo debe guardar el texto en **UTF-8 sin BOM y con finales LF**. CRLF añade un carácter de retorno de carro invisible; mezclarlo con LF puede generar errores de formato o diffs de archivos completos. Los espacios finales también pueden producir avisos. Esto no confirma por sí solo la causa de un error: revisar siempre el mensaje concreto.

## Configuración incluida

- `.editorconfig`: UTF-8 sin BOM, LF, salto final y eliminación de espacios finales. Conserva espacios significativos de Markdown y CRLF en scripts Windows.
- `.vscode/settings.json`: aplica esas preferencias en VS Code sin exigir extensiones. Abrir la carpeta del repositorio como carpeta de trabajo; en un workspace padre las configuraciones de subcarpetas no se aplican automáticamente.
- En otros editores, habilitar compatibilidad con EditorConfig. No se exige instalar nuevos paquetes del proyecto.

Estas reglas actúan al editar/guardar. No convierten silenciosamente todos los archivos ni modifican valores de `.env`.

## Git y la normalización existente

Ya existe [el PR #2 de .gitattributes](https://github.com/ArmandoAgui/be_boilerplate_is_2026/pull/2), con destino develop y pendiente de integración al preparar este documento. Ese PR normaliza el texto en Git y protege binarios. Esta entrega es complementaria: no copia ni sustituye ese trabajo y no modifica su rama o destino. Coordinar que ambas configuraciones lleguen a las ramas usadas por el equipo.

Con .gitattributes integrado, Git seguirá las reglas del repositorio independientemente del sistema operativo. Para evitar conversiones locales adicionales se puede configurar **dentro de cada repositorio**:

```bash
git config --local core.autocrlf false
git config --local core.eol lf
```

No es necesario cambiar configuración global. Si ya hay cambios locales, conservarlos antes de actualizar ramas; no usar reset --hard ni restaurar archivos con trabajo pendiente para corregir el formato.

## Si un archivo existente sigue con el problema

En VS Code, abrir el archivo y revisar la barra inferior: elegir **LF** donde aparezca CRLF y **Guardar con codificación → UTF-8** si tiene BOM u otra codificación. Guardar y revisar el diff. Para avisos de espacios, usar “Recortar espacios en blanco finales”, respetando Markdown.

```bash
git diff --check
git ls-files --eol
```

La normalización masiva con `git add --renormalize` debe hacerse en una rama dedicada y con un árbol limpio, revisando el diff y separándola de cambios funcionales. Esta entrega no la ejecuta.

## Validación de esta entrega

Se verifican sintaxis de los JSON, LF/UTF-8 sin BOM en las configuraciones y git diff --check. No cambia código de aplicación ni dependencias; no requiere ejecutar suites de negocio. No se publican .env ni secretos.
