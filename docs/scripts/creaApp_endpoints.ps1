# Ejecuta en orden: boilerplate, estructura completa y colección Postman

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent | Split-Path -Parent
Set-Location $repoRoot

$cmds = @(
  '@agent #nodejs-base-boilerplate: generar el código base del servidor Express',
  'node docs/scripts/generate-full-structure-all.js docs/scripts/BD/script_creacionBd.sql',
  'node docs/scripts/generate-postman-collection.js docs/scripts/BD/script_creacionBd.sql'
)

foreach ($cmd in $cmds) {
  if ($cmd -like '@agent*') {
    Write-Host "AVISO: Este comando debe ejecutarse en el chat del agente:" -ForegroundColor Yellow
    Write-Host $cmd -ForegroundColor Yellow
    continue
  }

  Write-Host "Ejecutando: $cmd" -ForegroundColor Cyan
  $output = & powershell -NoProfile -Command $cmd 2>&1
  $exitCode = $LASTEXITCODE
  if ($output) { $output | Write-Host }
  if ($exitCode -ne 0) {
    Write-Host "Error al ejecutar: $cmd" -ForegroundColor Red
    exit $exitCode
  }
}
