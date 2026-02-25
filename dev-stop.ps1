$ErrorActionPreference = "SilentlyContinue"

Write-Host "Stopping all Node processes..." -ForegroundColor Yellow
Get-Process node | Stop-Process -Force

Write-Host "Stopped." -ForegroundColor Green
