$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$engine = Join-Path $root 'release\engine\catalyst-engine.exe'
$output = Join-Path $root 'release\installer'
$bundle = Join-Path $output 'models'

if (-not (Test-Path $engine)) { throw 'Build the packaged engine first.' }
& (Join-Path $PSScriptRoot 'build-app.ps1')
if (-not (Test-Path (Join-Path $root 'release\app\Catalyst.exe'))) { throw 'Build the native app first.' }
New-Item -ItemType Directory -Force -Path $output | Out-Null
New-Item -ItemType Directory -Force -Path $bundle | Out-Null

Push-Location (Join-Path $PSScriptRoot 'installer')
try {
  cargo build --release
  if ($LASTEXITCODE -ne 0) { throw "Installer compilation failed with exit code $LASTEXITCODE." }
} finally { Pop-Location }

Copy-Item (Join-Path $PSScriptRoot 'installer\target\release\catalyst-setup.exe') (Join-Path $output 'Catalyst-Setup.exe') -Force
foreach ($model in @(
  'catalyst-spark-2.1-q4_k_m.gguf',
  'catalyst-prism-2.1-q4_k_m.gguf',
  'catalyst-zenith-2.1-q4_k_m.gguf',
  'catalyst-apex-1.2-q4_k_m.gguf'
)) {
  $source = Join-Path $root "models\$model"
  if (Test-Path $source) {
    $destination = Join-Path $bundle $model
    if (-not (Test-Path $destination) -or ((Get-Item $destination).Length -ne (Get-Item $source).Length)) {
      Copy-Item $source $destination -Force
    }
    Write-Host "Bundled model: $model"
  } else {
    Write-Warning "Model not available for bundle: $model"
  }
}
Write-Host "Installer: $output\Catalyst-Setup.exe"
