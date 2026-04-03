param(
    [switch]$SkipSchema
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Read-EnvFile {
    param([string]$Path)

    $map = @{}
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) {
            return
        }

        $pair = $line -split "=", 2
        if ($pair.Length -eq 2) {
            $key = $pair[0].Trim()
            $value = $pair[1].Trim()
            $map[$key] = $value
        }
    }

    return $map
}

function Get-MySqlCommand {
    $cmd = Get-Command mysql -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    $fallbacks = @(
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe",
        "C:\xampp\mysql\bin\mysql.exe",
        "C:\Program Files\MariaDB 10.11\bin\mysql.exe",
        "C:\Program Files\MariaDB 11.4\bin\mysql.exe"
    )

    foreach ($path in $fallbacks) {
        if (Test-Path $path) {
            return $path
        }
    }

    return $null
}

$envPath = Join-Path $PSScriptRoot "backend/.env"
if (-not (Test-Path $envPath)) {
    Write-Error "Missing backend/.env. Configure DB settings first."
    exit 1
}

$config = Read-EnvFile -Path $envPath
$dbUser = if ($config.ContainsKey("DB_USER") -and $config["DB_USER"]) { $config["DB_USER"] } else { "root" }
$dbPassword = if ($config.ContainsKey("DB_PASSWORD")) { $config["DB_PASSWORD"] } else { "" }
$dbHost = if ($config.ContainsKey("DB_HOST") -and $config["DB_HOST"]) { $config["DB_HOST"] } else { "localhost" }
$dbPort = if ($config.ContainsKey("DB_PORT") -and $config["DB_PORT"]) { $config["DB_PORT"] } else { "3306" }

if (-not $SkipSchema) {
    $mysqlCommand = Get-MySqlCommand
    if (-not $mysqlCommand) {
        Write-Error "MySQL CLI not found in PATH. Install MySQL client or add mysql.exe to PATH."
        exit 1
    }

    $schemaPath = Join-Path $PSScriptRoot "backend/schema.sql"
    if (-not (Test-Path $schemaPath)) {
        Write-Error "Missing backend/schema.sql"
        exit 1
    }

    Write-Host "Applying MySQL schema from backend/schema.sql ..."

    $mysqlArgs = @("-h", $dbHost, "-P", $dbPort, "-u", $dbUser)
    if ($dbPassword) {
        $mysqlArgs += "-p$dbPassword"
    }

    Get-Content $schemaPath | & $mysqlCommand @mysqlArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Schema import failed. Check DB credentials and MySQL server status."
        exit 1
    }

    Write-Host "Schema import complete."
}

$backendDir = Join-Path $PSScriptRoot "backend"
Set-Location $backendDir

$pythonExec = if (Test-Path ".\\venv\\Scripts\\python.exe") { ".\\venv\\Scripts\\python.exe" } else { "python" }

Write-Host "Starting Flask backend with $pythonExec ..."
& $pythonExec app.py
