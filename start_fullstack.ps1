param(
    [switch]$InitSchema
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$backendScript = Join-Path $PSScriptRoot "bootstrap_backend_mysql.ps1"
if (-not (Test-Path $backendScript)) {
    Write-Error "Missing bootstrap_backend_mysql.ps1"
    exit 1
}

$backendArgs = @("-NoExit", "-ExecutionPolicy", "Bypass", "-File", $backendScript)
if (-not $InitSchema) {
    $backendArgs += "-SkipSchema"
}

Write-Host "Starting backend in a new PowerShell window..."
Start-Process powershell -ArgumentList $backendArgs | Out-Null

$frontendDir = Join-Path $PSScriptRoot "frontend"
if (-not (Test-Path $frontendDir)) {
    Write-Error "Missing frontend directory"
    exit 1
}

Set-Location $frontendDir

if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules not found. Running npm install..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm install failed"
        exit 1
    }
}

Write-Host "Starting frontend in current terminal..."
npm run dev
