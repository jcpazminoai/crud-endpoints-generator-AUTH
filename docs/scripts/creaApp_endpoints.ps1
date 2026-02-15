# Ejecuta en orden: boilerplate, estructura completa y colección Postman

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent | Split-Path -Parent
Set-Location $repoRoot

$cmds = @(
  @{ cmd = 'node'; args = @('docs/scripts/generate-base-boilerplate.js') },
  @{ cmd = 'node'; args = @('docs/scripts/generate-full-structure-all.js', 'docs/scripts/BD/script_creacionBd.sql') },
  @{ cmd = 'node'; args = @('docs/scripts/generate-postman-collection.js', 'docs/scripts/BD/script_creacionBd.sql') }
)

foreach ($cmd in $cmds) {
  if ($cmd -is [string] -and $cmd -like '@agent*') {
    Write-Host "AVISO: Este comando debe ejecutarse en el chat del agente:" -ForegroundColor Yellow
    Write-Host $cmd -ForegroundColor Yellow
    continue
  }

  if ($cmd -is [hashtable]) {
    $pretty = "$($cmd.cmd) " + ($cmd.args -join ' ')
    Write-Host "Ejecutando: $pretty" -ForegroundColor Cyan
    & $cmd.cmd @($cmd.args)
  } else {
    Write-Host "Ejecutando: $cmd" -ForegroundColor Cyan
    & $cmd
  }
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    if ($cmd -is [hashtable]) {
      Write-Host "Error al ejecutar: $pretty" -ForegroundColor Red
    } else {
      Write-Host "Error al ejecutar: $cmd" -ForegroundColor Red
    }
    exit $exitCode
  }
}
