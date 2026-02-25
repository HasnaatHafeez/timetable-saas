$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Stop-PortProcess {
	param([int]$Port)

	$lines = netstat -ano | Select-String "LISTENING" | Select-String ":$Port"
	if (-not $lines) { return }

	$pids = @()
	foreach ($line in $lines) {
		$parts = ($line.ToString() -split "\s+") | Where-Object { $_ -ne "" }
		if ($parts.Length -gt 0) {
			$pidText = $parts[$parts.Length - 1]
			if ($pidText -match "^\d+$" -and [int]$pidText -gt 0) {
				$pids += [int]$pidText
			}
		}
	}

	$pids = $pids | Sort-Object -Unique
	foreach ($processId in $pids) {
		try {
			Stop-Process -Id $processId -Force -ErrorAction Stop
			Write-Host "Freed port $Port (stopped PID $processId)" -ForegroundColor Yellow
		} catch {
			Write-Host "Could not stop PID $processId on port $Port" -ForegroundColor DarkYellow
		}
	}
}

Write-Host "Stopping existing Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

Write-Host "Freeing required ports..." -ForegroundColor Yellow
Stop-PortProcess -Port 5000
Stop-PortProcess -Port 8080
Start-Sleep -Seconds 1

Write-Host "Starting backend on port 5000..." -ForegroundColor Cyan
$backendCmd = "Set-Location '$root\backend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd | Out-Null

Write-Host "Starting frontend on port 8080..." -ForegroundColor Cyan
$frontendCmd = "Set-Location '$root\frontend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd | Out-Null

Write-Host "Done. Backend: http://localhost:5000 | Frontend: http://localhost:8080" -ForegroundColor Green
