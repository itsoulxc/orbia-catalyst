$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$output = Join-Path $root 'release\engine'
$work = Join-Path $root 'release\pyinstaller'

New-Item -ItemType Directory -Force -Path $output | Out-Null
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed with exit code $LASTEXITCODE." }
python -m PyInstaller `
  --noconfirm `
  --clean `
  --distpath $output `
  --workpath $work `
  (Join-Path $PSScriptRoot 'catalyst-engine.spec')
if ($LASTEXITCODE -ne 0) { throw "Engine packaging failed with exit code $LASTEXITCODE." }

Write-Host "Engine bundle: $output\catalyst-engine.exe"
