# Generador de Endpoints (Node.js + Express)

Repositorio para personas que necesitan generar endpoints básicos a partir de un script de creación de base de datos (MySQL).

## Qué hace
- Genera los programas necesarios para tener endpoints básicos (con autorización mediante login) por cada tabla de la base de datos.
- Provee una colección de Postman para probar los endpoints generados.

## Requisitos
- Node.js 18+
- MySQL 8+
- mysql2 (driver)

## Cómo usar
1. Descarga este repositorio.
2. Pega tu script de creación de base de datos en `docs/scripts/BD/script_creacionBd.sql`.
3. Sigue las instrucciones en `docs/indicaciones/indicacionesIniciales.md`.

## Resultado
- Backend con endpoints básicos por tabla.
- Archivo para importar en Postman y probar los endpoints.
