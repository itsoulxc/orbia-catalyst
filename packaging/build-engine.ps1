$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$output = Join-Path $root 'release\engine'
$work = Join-Path $root 'release\pyinstaller'
$pythonCandidates = @(
  $env:CATALYST_PYTHON,
  (Join-Path $env:USERPROFILE 'AppData\Local\Programs\Python\Python314\python.exe'),
  (Join-Path $env:USERPROFILE 'AppData\Local\Programs\Python\Python313\python.exe'),
  (Join-Path $env:USERPROFILE 'AppData\Local\Programs\Python\Python312\python.exe')
)
$python = $pythonCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $python) { throw 'Could not find a real Python interpreter. Set CATALYST_PYTHON to python.exe.' }

New-Item -ItemType Directory -Force -Path $output | Out-Null
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed with exit code $LASTEXITCODE." }
& $python -m PyInstaller `
  --noconfirm `
  --clean `
  --distpath $output `
  --workpath $work `
  (Join-Path $PSScriptRoot 'catalyst-engine.spec')
if ($LASTEXITCODE -ne 0) { throw "Engine packaging failed with exit code $LASTEXITCODE." }

Write-Host "Engine bundle: $output\catalyst-engine.exe"
