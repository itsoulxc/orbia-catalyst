$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location (Join-Path $PSScriptRoot 'app')
try { cargo build --release; if ($LASTEXITCODE -ne 0) { throw 'Native app build failed.' } }
finally { Pop-Location }
New-Item -ItemType Directory -Force -Path (Join-Path $root 'release\app') | Out-Null
Copy-Item (Join-Path $PSScriptRoot 'app\target\release\catalyst-app.exe') (Join-Path $root 'release\app\Catalyst.exe') -Force
