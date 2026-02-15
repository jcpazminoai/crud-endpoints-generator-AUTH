# Skill: NodeJS Full Architecture Generator

Esta *skill* instruye al agente a crear una estructura de proyecto Node.js completa, utilizando una arquitectura en capas con el patrón Repositorio y separación clara de responsabilidades.

## Instrucciones del Agente

* **Esquema de Base de Datos de Referencia:**
  * Si el comando incluye la ruta del archivo SQL, úsala.
* Si no, busca `docs/scripts/BD/script_creacionBd.sql` en el repo actual.
  * Si no existe, pide al usuario la ruta del SQL antes de continuar.

Cuando se le pida crear una nueva funcionalidad (ej. `@agent #nodejs-full-structure: crear archivos para la tabla "users"`), el agente DEBE usar los templates en `templates/` como fuente y reemplazar placeholders:

- `{{Entity}}`: Nombre en PascalCase (ej. `User`)
- `{{entity}}`: Nombre en camelCase (ej. `user`)
- `{{table}}`: Nombre real de la tabla (ej. `users`)

Templates disponibles:

- `templates/controller.js.tmpl` -> `src/controllers/{{entity}}Controller.js`
- `templates/service.js.tmpl` -> `src/services/{{entity}}Service.js`
- `templates/repository.js.tmpl` -> `src/repositories/{{entity}}Repository.js`
- `templates/routes.js.tmpl` -> `src/routes/{{table}}.js`
- `templates/db.pool.js.tmpl` -> `src/db/pool.js` (si no existe)

Además debe registrar la nueva ruta en `src/routes/index.js` si aplica.

## Convenciones

* Mapear columnas `snake_case` de la BD a `camelCase` en el payload.
* Validar entradas mínimas en el Service (campos requeridos).
* Usar códigos HTTP estándar (200, 201, 400, 404, 500).

## Ejemplo de comando

`@agent #nodejs-full-structure: crear archivos para la tabla "users" usando docs/scripts/BD/BD_ToDoList.sql`

## Herramientas Permitidas

* `fs.create_directory(path)`: Para crear las carpetas necesarias.
* `fs.create_file(path, content)`: Para generar los archivos con el contenido de las plantillas especificadas arriba.
