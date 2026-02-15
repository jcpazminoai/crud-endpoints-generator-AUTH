# Skill: NodeJS Base Boilerplate Generator

Esta *skill* instruye al agente a generar los archivos base necesarios para iniciar un servidor Express y manejar *middlewares* genéricos para un proyecto Node.js.

## Instrucciones del Agente

Cuando se le pida crear el *boilerplate* o código base del proyecto, el agente DEBE usar los templates en `templates/` como fuente única y copiar su contenido a los archivos de salida, manteniendo rutas y nombres.

Templates disponibles:

- `templates/app.js.tmpl` -> `src/app.js`
- `templates/server.js.tmpl` -> `server.js`
- `templates/routes.index.js.tmpl` -> `src/routes/index.js`
- `templates/middlewares.errorHandler.js.tmpl` -> `src/middlewares/errorHandler.js`
- `templates/middlewares.notFound.js.tmpl` -> `src/middlewares/notFound.js`
- `templates/middlewares.auth.js.tmpl` -> `src/middlewares/auth.js`
- `templates/package.json.tmpl` -> `package.json`
- `templates/.env.example.tmpl` -> `.env.example`
- `templates/README.md.tmpl` -> `README.md`

Si una carpeta no existe, debe crearla antes de escribir los archivos.

## Ejemplo de comando

`@agent #nodejs-base-boilerplate: generar el código base del servidor Express`

## Herramientas Permitidas

* `fs.create_file(path, content)`: Para generar los archivos con el contenido de las plantillas especificadas.
* `fs.create_directory(path)`: Para asegurar que las carpetas necesarias existan.
