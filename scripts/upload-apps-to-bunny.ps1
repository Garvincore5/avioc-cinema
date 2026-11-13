# ==============================================================================
# Avioc Cinema - Upload Apps to BunnyCDN (/avioc app/avioc cinema/)
# ==============================================================================
param(
    [string]$AccessKey = "936d5fc0-203e-4995-8943a1e59562-03d4-4923",
    [string]$StorageBase = "https://storage.bunnycdn.com/aviocwatch/avioc app/avioc cinema",
    [string]$CdnBase = "https://aviocwatch.b-cdn.net/avioc%20app/avioc%20cinema",
    [string]$SourceDir = "$PSScriptRoot\..\release-binaries"
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Avioc Apps - Uploading Binaries to BunnyCDN             " -ForegroundColor Cyan
Write-Host "  Destination: /avioc app/avioc cinema/                   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (-not (Test-Path $SourceDir)) {
    Write-Warning "Source directory $SourceDir not found."
    exit 0
}

$files = Get-ChildItem -Path $SourceDir -File -Recurse | Where-Object {
    $_.Extension -in @(".apk", ".exe", ".dmg", ".ipa", ".mobileconfig", ".zip")
}

if (-not $files) {
    Write-Warning "No app files (.apk, .exe, .dmg, .ipa, .mobileconfig) found in $SourceDir to upload."
    exit 0
}

$headers = @{
    "AccessKey" = $AccessKey
    "Content-Type" = "application/octet-stream"
}

foreach ($f in $files) {
    $dest = "$StorageBase/$($f.Name)"
    $cdnUrl = "$CdnBase/$([System.Uri]::EscapeDataString($f.Name))"
    Write-Host "Uploading $($f.Name) ($([math]::Round($f.Length/1MB, 2)) MB)..." -ForegroundColor DarkCyan
    try {
        $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
        Invoke-RestMethod -Uri $dest -Method Put -Headers $headers -Body $bytes | Out-Null
        Write-Host "[OK] $($f.Name) uploaded successfully!" -ForegroundColor Green
        Write-Host "     CDN URL: $cdnUrl" -ForegroundColor Gray
    } catch {
        Write-Warning "Failed to upload $($f.Name): $_"
    }
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "All available apps uploaded to BunnyCDN /avioc app/avioc cinema/!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
