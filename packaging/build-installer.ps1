$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$engine = Join-Path $root 'release\engine\catalyst-engine.exe'
$output = Join-Path $root 'release\installer'

if (-not (Test-Path $engine)) { throw 'Build the packaged engine first.' }
& (Join-Path $PSScriptRoot 'build-app.ps1')
if (-not (Test-Path (Join-Path $root 'release\app\Catalyst.exe'))) { throw 'Build the native app first.' }
New-Item -ItemType Directory -Force -Path $output | Out-Null

Push-Location (Join-Path $PSScriptRoot 'installer')
try {
  cargo build --release
  if ($LASTEXITCODE -ne 0) { throw "Installer compilation failed with exit code $LASTEXITCODE." }
} finally { Pop-Location }

Copy-Item (Join-Path $PSScriptRoot 'installer\target\release\catalyst-setup.exe') (Join-Path $output 'Catalyst-Setup.exe') -Force
Write-Host "Installer: $output\Catalyst-Setup.exe"
