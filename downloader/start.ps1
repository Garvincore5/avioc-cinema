# VIDOR - Universal Media Downloader Launcher
$Host.UI.RawUI.WindowTitle = "VIDOR - Universal Media Downloader"
Set-Location -Path $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Magenta
Write-Host "  VIDOR - UNIVERSAL VIDEO & MUSIC DOWNLOADER" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Starting Vidor Server..." -ForegroundColor Cyan
Write-Host "Open your browser at: http://localhost:5000" -ForegroundColor Green
Write-Host ""

py app.py
