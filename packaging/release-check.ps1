$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

npm.cmd run lint
npm.cmd run build
python -m py_compile server\engine_server.py server\overload_guard.py server\mcp_bridge.py scripts\download_models.py

$engine = Join-Path $root 'release\engine\catalyst-engine.exe'
if (-not (Test-Path $engine)) {
  throw 'Missing release engine. Run packaging\build-engine.ps1 first.'
}

$requiredModels = @(
  'models\catalyst-spark-2.0-q4_k_m.gguf',
  'models\catalyst-prism-2.0-q4_k_m.gguf',
  'models\catalyst-zenith-2.1-q4_k_m.gguf'
)
foreach ($model in $requiredModels) {
  if (-not (Test-Path (Join-Path $root $model))) { throw "Missing model: $model" }
}

Write-Host 'Release checks passed.'
