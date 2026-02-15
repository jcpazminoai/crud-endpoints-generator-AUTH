# Indicaciones Iniciales para Crear Proyecto Node.js con Agente IA

Sigue estos dos comandos principales en la ventana de chat de tu agente (VS Code Copilot o OpenCode CLI) para generar el proyecto desde cero, utilizando tus *skills* personalizadas.

## verificación previa
1. validar que el directorio D:...\.github existe (contiene los skills) 
2. validar que D:...\docs\scripts existe (contiene: indicaciones, BD, otros scripts importantes (3 en total))
3. validar que D:...\docs\scripts\BD\script_creacionBd.sql, contenga el script de la base de datos

## Tareas a ejecutar
1. Ejecutar el comando de **Boilerplate**.
@agent #nodejs-base-boilerplate: generar el código base del servidor Express

2. Ejecutar el comando para crear todoslos endpoints.
.\docs\scripts\creaApp_endpoints.ps1

3. Revisa el archivo README.md de la aplicación generada y realiza la Configuración

## Pruebas en Postman

* Abre la colección `test/BD_creada.postman_collection.json`.
* En `info.name`, cambia el nombre al de tu base de datos o al nombre que quieras para la colección.
* cárgalo a Postman y prueba los endpoints (recuerda primero Ejecutar la aplicación)
