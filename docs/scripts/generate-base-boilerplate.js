#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const templatesDir = path.join(
  repoRoot,
  '.github',
  'skills',
  'nodejs-base-boilerplate',
  'templates'
);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readFileSafe(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function main() {
  if (!fs.existsSync(templatesDir)) {
    console.error(`Templates dir not found: ${templatesDir}`);
    process.exit(1);
  }

  const mappings = [
    ['app.js.tmpl', path.join(repoRoot, 'src', 'app.js')],
    ['server.js.tmpl', path.join(repoRoot, 'server.js')],
    ['routes.index.js.tmpl', path.join(repoRoot, 'src', 'routes', 'index.js')],
    ['middlewares.errorHandler.js.tmpl', path.join(repoRoot, 'src', 'middlewares', 'errorHandler.js')],
    ['middlewares.notFound.js.tmpl', path.join(repoRoot, 'src', 'middlewares', 'notFound.js')],
    ['middlewares.auth.js.tmpl', path.join(repoRoot, 'src', 'middlewares', 'auth.js')],
    ['package.json.tmpl', path.join(repoRoot, 'package.json')],
    ['README.md.tmpl', path.join(repoRoot, 'README.md')],
  ];

  mappings.forEach(([tmpl, dest]) => {
    const src = path.join(templatesDir, tmpl);
    if (!fs.existsSync(src)) {
      console.error(`Template not found: ${src}`);
      process.exit(1);
    }
    const content = readFileSafe(src);
    writeFile(dest, content);
  });

  const envExamplePath = path.join(repoRoot, '.env.example');
  if (fs.existsSync(envExamplePath)) {
    fs.unlinkSync(envExamplePath);
  }

  console.log('Base boilerplate generated.');
}

main();
