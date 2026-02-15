#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const defaultSqlPath = path.join(repoRoot, 'docs', 'scripts', 'BD', 'BD_ToDoList.sql');
const sqlPath = path.resolve(process.argv[2] || defaultSqlPath);
const templatesDir = path.join(repoRoot, '.github', 'skills', 'nodejs-full-structure', 'templates');

function readFileSafe(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function singularize(name) {
  if (name.endsWith('ies')) return name.slice(0, -3) + 'y';
  if (name.endsWith('ses')) return name.slice(0, -2); // e.g., classes -> classe (best-effort)
  if (name.endsWith('s') && !name.endsWith('ss')) return name.slice(0, -1);
  return name;
}

function toPascalCase(name) {
  return name
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function toCamelCase(name) {
  const pascal = toPascalCase(name);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function parseTableNames(sql) {
  const regex = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+`?([a-zA-Z0-9_]+)`?/gi;
  const names = new Set();
  let match = null;
  while ((match = regex.exec(sql)) !== null) {
    names.add(match[1]);
  }
  return Array.from(names);
}

function parseCreateTableBlocks(sql) {
  const blocks = [];
  const regex = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+`?([a-zA-Z0-9_]+)`?\s*\(([^;]*?)\)\s*ENGINE/gi;
  let match = null;
  while ((match = regex.exec(sql)) !== null) {
    blocks.push({ name: match[1], body: match[2] });
  }
  return blocks;
}

function parseDbName(sql) {
  const createDbRegex = /CREATE\s+DATABASE(?:\s+IF\s+NOT\s+EXISTS)?\s+`?([a-zA-Z0-9_]+)`?/i;
  const useDbRegex = /USE\s+`?([a-zA-Z0-9_]+)`?/i;

  const createMatch = createDbRegex.exec(sql);
  if (createMatch) return createMatch[1];

  const useMatch = useDbRegex.exec(sql);
  if (useMatch) return useMatch[1];

  return null;
}

function parseColumns(blockBody) {
  const lines = blockBody
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const columns = [];

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (
      upper.startsWith('PRIMARY KEY') ||
      upper.startsWith('UNIQUE KEY') ||
      upper.startsWith('KEY ') ||
      upper.startsWith('CONSTRAINT')
    ) {
      continue;
    }

    const colMatch = /^`?([a-zA-Z0-9_]+)`?\s+([^,]+),?$/.exec(line);
    if (!colMatch) continue;

    const name = colMatch[1];
    const def = colMatch[2];
    const defUpper = def.toUpperCase();

    const isLikelyAutoId = name === 'id' && /INT/.test(defUpper) && !defUpper.includes('DEFAULT');
    const isAutoIncrement = defUpper.includes('AUTO_INCREMENT') || isLikelyAutoId;
    const isNullable = !defUpper.includes('NOT NULL');
    const hasDefault = defUpper.includes('DEFAULT');

    columns.push({ name, def, isAutoIncrement, isNullable, hasDefault });
  }

  return columns;
}

function renderTemplate(templatePath, replacements) {
  let content = readFileSafe(templatePath);
  Object.entries(replacements).forEach(([key, value]) => {
    const token = new RegExp(`{{${key}}}`, 'g');
    content = content.replace(token, value);
  });
  return content;
}

function writeIfMissing(filePath, content) {
  if (fs.existsSync(filePath)) return false;
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function updateEnvFile(dbName) {
  const envPath = path.join(repoRoot, '.env');
  const templatePath = path.join(
    repoRoot,
    '.github',
    'skills',
    'nodejs-base-boilerplate',
    'templates',
    '.env.example.tmpl'
  );
  if (!fs.existsSync(templatePath)) return;
  const content = readFileSafe(templatePath);
  const updated = content.replace(/DB_NAME=.*/g, `DB_NAME=${dbName}`);
  writeFile(envPath, updated);
}

function updateRoutesIndex(routesIndexPath, table) {
  const requireLine = `const ${table}Routes = require('./${table}');`;
  const useLine = `router.use('/${table}', ${table}Routes);`;

  let content = readFileSafe(routesIndexPath);

  if (!content.includes(requireLine)) {
    if (content.includes('const router = express.Router();')) {
      content = content.replace(
        /const router = express\.Router\(\);\r?\n/,
        match => `${match}${requireLine}\n`
      );
    } else {
      content = `${requireLine}\n${content}`;
    }
  }

  if (!content.includes(useLine)) {
    if (content.includes('// AUTO-ROUTES')) {
      content = content.replace(
        /\/\/ AUTO-ROUTES\r?\n/,
        `// AUTO-ROUTES\n${useLine}\n`
      );
    } else if (content.includes('module.exports = router;')) {
      content = content.replace(
        /module\.exports = router;\r?\n?$/,
        `${useLine}\n\nmodule.exports = router;\n`
      );
    } else {
      content = `${content}\n${useLine}\n`;
    }
  }

  fs.writeFileSync(routesIndexPath, content, 'utf8');
}

function writeAuthFiles() {
  const outMap = [
    ['auth.controller.js.tmpl', path.join(repoRoot, 'src', 'controllers', 'authController.js')],
    ['auth.service.js.tmpl', path.join(repoRoot, 'src', 'services', 'authService.js')],
    ['auth.routes.js.tmpl', path.join(repoRoot, 'src', 'routes', 'auth.js')],
  ];

  outMap.forEach(([tmpl, dest]) => {
    const templatePath = path.join(templatesDir, tmpl);
    if (!fs.existsSync(templatePath)) return;
    const content = renderTemplate(templatePath, {});
    writeFile(dest, content);
  });

  const routesIndexPath = path.join(repoRoot, 'src', 'routes', 'index.js');
  if (fs.existsSync(routesIndexPath)) {
    updateRoutesIndex(routesIndexPath, 'auth');
  }
}

function renderReadme(tableNames, dbName) {
  const lines = [];

  lines.push('# Backend API (Node.js + Express)');
  lines.push('');
  lines.push('## Que hace la aplicacion');
  lines.push('API REST para gestionar entidades definidas en la base de datos (CRUD por tabla).');
  lines.push('');
  lines.push('## Stack tecnologico');
  lines.push('- Node.js 18+');
  lines.push('- Express');
  lines.push('- MySQL 8+');
  lines.push('');
  lines.push('## Como instalarla');
  lines.push('1. Ubicate en la raiz del backend.');
  lines.push('2. Instala dependencias:');
  lines.push('   ```');
  lines.push('   npm install');
  lines.push('   ```');
  lines.push('');
  lines.push('## Como correrla');
  lines.push('```');
  lines.push('npm run dev');
  lines.push('```');
  lines.push('');
  lines.push('## Estructura del proyecto');
  lines.push('- `server.js`');
  lines.push('- `src/app.js`');
  lines.push('- `src/controllers/*Controller.js`');
  lines.push('- `src/services/*Service.js`');
  lines.push('- `src/repositories/*Repository.js`');
  lines.push('- `src/routes/*.js`');
  lines.push('- `src/db/pool.js`');
  lines.push('');
  lines.push('## Tests');
  lines.push('No hay tests automatizados configurados por defecto.');
  lines.push('Recursos de prueba:');
  lines.push('- `test/BD_creada.postman_collection.json`');
  lines.push('- `test/openapi.yaml`');
  lines.push('');
  lines.push('## Endpoints base');
  lines.push('- `GET /health`');
  lines.push('');
  lines.push('## Autenticacion');
  lines.push('- Usa `POST /auth/login` para obtener un token.');
  lines.push('- En endpoints protegidos envia el header `Authorization: Bearer <token>`.');
  lines.push('');
  lines.push('## Endpoints publicos');
  lines.push('- `GET /health`');
  lines.push('- `POST /auth/login`');
  lines.push('');
  lines.push('## Endpoints protegidos (requieren Bearer token)');
  lines.push('- `GET /users`');
  lines.push('- `GET /users/:id`');
  lines.push('- `POST /users`');
  lines.push('- `PUT /users/:id`');
  lines.push('- `DELETE /users/:id`');
  lines.push('- `GET /categories`');
  lines.push('- `GET /categories/:id`');
  lines.push('- `POST /categories`');
  lines.push('- `PUT /categories/:id`');
  lines.push('- `DELETE /categories/:id`');
  lines.push('- `GET /tasks`');
  lines.push('- `GET /tasks/:id`');
  lines.push('- `POST /tasks`');
  lines.push('- `PUT /tasks/:id`');
  lines.push('- `DELETE /tasks/:id`');
  lines.push('');
  lines.push('## Endpoints por tabla');

  tableNames.forEach((table) => {
    lines.push('');
    lines.push(`### Tabla: ${table}`);
    lines.push('| Endpoint | Explicacion |');
    lines.push('| --- | --- |');
    lines.push(`| \`GET /${table}\` | Listar registros. |`);
    lines.push(`| \`GET /${table}/:id\` | Obtener un registro por id. |`);
    lines.push(`| \`POST /${table}\` | Crear un nuevo registro. |`);
    lines.push(`| \`PUT /${table}/:id\` | Actualizar un registro por id. |`);
    lines.push(`| \`DELETE /${table}/:id\` | Eliminar un registro por id. |`);
  });

  lines.push('');
  return lines.join('\n');
}

function writeReadme(tableNames, dbName) {
  const readmePath = path.join(repoRoot, 'README.md');
  const content = renderReadme(tableNames, dbName);
  fs.writeFileSync(readmePath, content, 'utf8');
}

function openApiType(def) {
  const upper = def.toUpperCase();
  if (upper.includes('INT')) return { type: 'integer' };
  if (upper.includes('DECIMAL') || upper.includes('NUMERIC') || upper.includes('FLOAT') || upper.includes('DOUBLE')) {
    return { type: 'number' };
  }
  if (upper.includes('DATE') && !upper.includes('DATETIME')) return { type: 'string', format: 'date' };
  if (upper.includes('DATETIME') || upper.includes('TIMESTAMP')) return { type: 'string', format: 'date-time' };
  return { type: 'string' };
}

function buildSchemas(tables) {
  const lines = [];
  lines.push('components:');
  lines.push('  responses:');
  lines.push('    InvalidCredentials:');
  lines.push('      description: Invalid credentials');
  lines.push('      content:');
  lines.push('        application/json:');
  lines.push('          schema:');
  lines.push("            $ref: '#/components/schemas/ErrorResponse'");
  lines.push('          example:');
  lines.push('            error: Invalid credentials');
  lines.push('    InvalidId:');
  lines.push('      description: Invalid id');
  lines.push('      content:');
  lines.push('        application/json:');
  lines.push('          schema:');
  lines.push("            $ref: '#/components/schemas/ErrorResponse'");
  lines.push('          example:');
  lines.push('            error: Invalid id');
  lines.push('    Unauthorized:');
  lines.push('      description: Unauthorized');
  lines.push('      content:');
  lines.push('        application/json:');
  lines.push('          schema:');
  lines.push("            $ref: '#/components/schemas/ErrorResponse'");
  lines.push('          example:');
  lines.push('            error: Unauthorized');
  lines.push('    InternalServerError:');
  lines.push('      description: Internal Server Error');
  lines.push('      content:');
  lines.push('        application/json:');
  lines.push('          schema:');
  lines.push("            $ref: '#/components/schemas/ErrorResponse'");
  lines.push('          example:');
  lines.push('            error: Internal Server Error');
  tables.forEach((table) => {
    const schemaName = toPascalCase(singularize(table.name));
    const notFoundName = `${schemaName}NotFound`;
    lines.push(`    ${notFoundName}:`);
    lines.push(`      description: ${schemaName} not found`);
    lines.push('      content:');
    lines.push('        application/json:');
    lines.push('          schema:');
    lines.push("            $ref: '#/components/schemas/ErrorResponse'");
    lines.push('          example:');
    lines.push(`            error: ${schemaName} not found`);
  });
  lines.push('  schemas:');
  lines.push('    ErrorResponse:');
  lines.push('      type: object');
  lines.push('      properties:');
  lines.push('        error:');
  lines.push('          type: string');
  lines.push('      required:');
  lines.push('        - error');
  lines.push('    AuthLoginRequest:');
  lines.push('      type: object');
  lines.push('      properties:');
  lines.push('        email:');
  lines.push('          type: string');
  lines.push('        password:');
  lines.push('          type: string');
  lines.push('      required:');
  lines.push('        - email');
  lines.push('        - password');
  lines.push('    AuthLoginResponse:');
  lines.push('      type: object');
  lines.push('      properties:');
  lines.push('        token:');
  lines.push('          type: string');
  lines.push('        user:');
  lines.push('          type: object');
  lines.push('          properties:');
  lines.push('            id:');
  lines.push('              type: integer');
  lines.push('            full_name:');
  lines.push('              type: string');
  lines.push('            email:');
  lines.push('              type: string');
  lines.push('      required:');
  lines.push('        - token');
  lines.push('        - user');

  tables.forEach((table) => {
    const schemaName = toPascalCase(singularize(table.name));
    const inputName = `${schemaName}Input`;

    lines.push(`    ${schemaName}:`);
    lines.push('      type: object');
    lines.push('      properties:');
    table.columns.forEach((col) => {
      const t = openApiType(col.def);
      lines.push(`        ${col.name}:`);
      lines.push(`          type: ${t.type}`);
      if (t.format) lines.push(`          format: ${t.format}`);
    });

    lines.push(`    ${inputName}:`);
    lines.push('      type: object');
    lines.push('      properties:');
    const required = [];
    table.columns.forEach((col) => {
      if (col.isAutoIncrement) return;
      if (col.hasDefault && /CURRENT_TIMESTAMP/i.test(col.def)) return;
      const t = openApiType(col.def);
      lines.push(`        ${col.name}:`);
      lines.push(`          type: ${t.type}`);
      if (t.format) lines.push(`          format: ${t.format}`);
      if (!col.isNullable && !col.hasDefault) required.push(col.name);
    });
    if (required.length > 0) {
      lines.push('      required:');
      required.forEach((name) => lines.push(`        - ${name}`));
    }
  });

  return lines;
}

function buildPaths(tables) {
  const lines = [];
  lines.push('paths:');
  lines.push('  /health:');
  lines.push('    get:');
  lines.push('      summary: Health check');
  lines.push('      responses:');
  lines.push("        '200':");
  lines.push('          description: OK');
  lines.push("        '500':");
  lines.push("          $ref: '#/components/responses/InternalServerError'");
  lines.push('  /auth/login:');
  lines.push('    post:');
  lines.push('      summary: Login');
  lines.push('      requestBody:');
  lines.push('        required: true');
  lines.push('        content:');
  lines.push('          application/json:');
  lines.push('            schema:');
  lines.push("              $ref: '#/components/schemas/AuthLoginRequest'");
  lines.push('      responses:');
  lines.push("        '200':");
  lines.push('          description: OK');
  lines.push('          content:');
  lines.push('            application/json:');
  lines.push('              schema:');
  lines.push("                $ref: '#/components/schemas/AuthLoginResponse'");
  lines.push("        '400':");
  lines.push("          $ref: '#/components/responses/InvalidCredentials'");
  lines.push("        '401':");
  lines.push("          $ref: '#/components/responses/Unauthorized'");
  lines.push("        '500':");
  lines.push("          $ref: '#/components/responses/InternalServerError'");

  tables.forEach((table) => {
    const schemaName = toPascalCase(singularize(table.name));
    const inputName = `${schemaName}Input`;
    const base = `/${table.name}`;
    const notFoundRef = `#/components/responses/${schemaName}NotFound`;

    lines.push(`  ${base}:`);
    lines.push('    get:');
    lines.push(`      summary: Listar ${table.name}`);
    lines.push('      responses:');
    lines.push("        '200':");
    lines.push('          description: OK');
    lines.push("        '401':");
    lines.push("          $ref: '#/components/responses/Unauthorized'");
    lines.push("        '500':");
    lines.push("          $ref: '#/components/responses/InternalServerError'");
    lines.push('    post:');
    lines.push(`      summary: Crear ${table.name}`);
    lines.push('      requestBody:');
    lines.push('        required: true');
    lines.push('        content:');
    lines.push('          application/json:');
    lines.push('            schema:');
    lines.push(`              $ref: '#/components/schemas/${inputName}'`);
    lines.push('      responses:');
    lines.push("        '201':");
    lines.push('          description: Created');
    lines.push("        '401':");
    lines.push("          $ref: '#/components/responses/Unauthorized'");
    lines.push("        '500':");
    lines.push("          $ref: '#/components/responses/InternalServerError'");

    lines.push(`  ${base}/{id}:`);
    lines.push('    get:');
    lines.push(`      summary: Obtener ${table.name} por id`);
    lines.push('      parameters:');
    lines.push('        - in: path');
    lines.push('          name: id');
    lines.push('          required: true');
    lines.push('          schema:');
    lines.push('            type: integer');
    lines.push('      responses:');
    lines.push("        '200':");
    lines.push('          description: OK');
    lines.push("        '400':");
    lines.push("          $ref: '#/components/responses/InvalidId'");
    lines.push("        '401':");
    lines.push("          $ref: '#/components/responses/Unauthorized'");
    lines.push("        '404':");
    lines.push(`          $ref: '${notFoundRef}'`);
    lines.push("        '500':");
    lines.push("          $ref: '#/components/responses/InternalServerError'");
    lines.push('    put:');
    lines.push(`      summary: Actualizar ${table.name} por id`);
    lines.push('      parameters:');
    lines.push('        - in: path');
    lines.push('          name: id');
    lines.push('          required: true');
    lines.push('          schema:');
    lines.push('            type: integer');
    lines.push('      requestBody:');
    lines.push('        required: true');
    lines.push('        content:');
    lines.push('          application/json:');
    lines.push('            schema:');
    lines.push(`              $ref: '#/components/schemas/${inputName}'`);
    lines.push('      responses:');
    lines.push("        '200':");
    lines.push('          description: OK');
    lines.push("        '400':");
    lines.push("          $ref: '#/components/responses/InvalidId'");
    lines.push("        '401':");
    lines.push("          $ref: '#/components/responses/Unauthorized'");
    lines.push("        '404':");
    lines.push(`          $ref: '${notFoundRef}'`);
    lines.push("        '500':");
    lines.push("          $ref: '#/components/responses/InternalServerError'");
    lines.push('    delete:');
    lines.push(`      summary: Eliminar ${table.name} por id`);
    lines.push('      parameters:');
    lines.push('        - in: path');
    lines.push('          name: id');
    lines.push('          required: true');
    lines.push('          schema:');
    lines.push('            type: integer');
    lines.push('      responses:');
    lines.push("        '200':");
    lines.push('          description: OK');
    lines.push("        '400':");
    lines.push("          $ref: '#/components/responses/InvalidId'");
    lines.push("        '401':");
    lines.push("          $ref: '#/components/responses/Unauthorized'");
    lines.push("        '404':");
    lines.push(`          $ref: '${notFoundRef}'`);
    lines.push("        '500':");
    lines.push("          $ref: '#/components/responses/InternalServerError'");
  });

  return lines;
}

function writeOpenApi(tables) {
  const openApiPath = path.join(repoRoot, 'test', 'openapi.yaml');
  ensureDir(path.dirname(openApiPath));
  const lines = [];
  lines.push('openapi: 3.0.3');
  lines.push('info:');
  lines.push('  title: Backend API');
  lines.push('  version: 1.0.0');
  lines.push('  description: Especificacion generada automaticamente a partir del SQL.');
  lines.push('servers:');
  lines.push('  - url: http://localhost:3000');
  lines.push('');
  lines.push(...buildPaths(tables));
  lines.push('');
  lines.push(...buildSchemas(tables));
  lines.push('');
  fs.writeFileSync(openApiPath, lines.join('\n'), 'utf8');
}

function generateForTable(table) {
  const singular = singularize(table);
  const entity = toCamelCase(singular);
  const Entity = toPascalCase(singular);

  const replacements = {
    Entity,
    entity,
    table,
  };

  const outMap = [
    ['controller.js.tmpl', path.join(repoRoot, 'src', 'controllers', `${entity}Controller.js`)],
    ['service.js.tmpl', path.join(repoRoot, 'src', 'services', `${entity}Service.js`)],
    ['repository.js.tmpl', path.join(repoRoot, 'src', 'repositories', `${entity}Repository.js`)],
    ['routes.js.tmpl', path.join(repoRoot, 'src', 'routes', `${table}.js`)],
  ];

  outMap.forEach(([tmpl, dest]) => {
    const templatePath = path.join(templatesDir, tmpl);
    const content = renderTemplate(templatePath, replacements);
    writeIfMissing(dest, content);
  });

  const poolPath = path.join(repoRoot, 'src', 'db', 'pool.js');
  if (!fs.existsSync(poolPath)) {
    const poolTemplate = path.join(templatesDir, 'db.pool.js.tmpl');
    const content = renderTemplate(poolTemplate, replacements);
    writeIfMissing(poolPath, content);
  }

  const routesIndexPath = path.join(repoRoot, 'src', 'routes', 'index.js');
  if (fs.existsSync(routesIndexPath)) {
    updateRoutesIndex(routesIndexPath, table);
  }
}

function promptDbName(defaultValue) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve(defaultValue);
      return;
    }

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('No se detecto nombre de base de datos en el SQL.');
    rl.question(`Digita el nombre de la base de datos [${defaultValue}]: `, (answer) => {
      const name = (answer || '').trim();
      rl.close();
      process.stdout.write('\n');
      resolve(name || defaultValue);
    });
  });
}

async function main() {
  if (!fs.existsSync(sqlPath)) {
    console.error(`SQL file not found: ${sqlPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(templatesDir)) {
    console.error(`Templates dir not found: ${templatesDir}`);
    process.exit(1);
  }

  ensureDir(path.join(repoRoot, 'test'));

  const sql = readFileSafe(sqlPath);
  if (!sql || sql.trim().length === 0) {
    console.error('SQL file is empty or has no valid content.');
    process.exit(1);
  }

  const detectedDbName = parseDbName(sql);
  if (detectedDbName) {
    console.log(`DB_NAME detectado desde SQL: ${detectedDbName}`);
  }
  const dbName = detectedDbName || await promptDbName('nombre_baseDatos');

  const blocks = parseCreateTableBlocks(sql);
  const tableNames = blocks.map(block => block.name);

  if (tableNames.length === 0) {
    console.error('No CREATE TABLE statements found. Verifica que el SQL tenga definiciones validas.');
    process.exit(1);
  }

  const tables = blocks.map(block => ({
    name: block.name,
    columns: parseColumns(block.body),
  }));

  updateEnvFile(dbName);
  tableNames.forEach(generateForTable);
  writeAuthFiles();
  writeReadme(tableNames, dbName);
  writeOpenApi(tables);
  console.log(`Generated structure for tables: ${tableNames.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
