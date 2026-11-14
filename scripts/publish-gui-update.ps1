# ==============================================================================
# Avioc Cinema - Publish Over-The-Air (OTA) GUI Update to BunnyCDN
# ==============================================================================
param(
    [string]$AccessKey = $env:BUNNY_STORAGE_ZONE_KEY,
    [string]$StorageBase = "https://storage.bunnycdn.com/aviocwatch",
    [string]$GuiDir = "$PSScriptRoot\..\gui-patch"
)

$ErrorActionPreference = "Stop"
if (-not $AccessKey) { throw "Set BUNNY_STORAGE_ZONE_KEY in your environment before uploading." }

Write-Host "Publishing Live GUI Update to BunnyCDN..."

$versionFile = Join-Path $GuiDir "gui-version.json"
$cssFile = Join-Path $GuiDir "gui-patch.css"
$jsFile = Join-Path $GuiDir "gui-patch.js"

if (-not (Test-Path $versionFile)) {
    throw "Could not find $versionFile"
}

$versionData = Get-Content -Path $versionFile -Raw | ConvertFrom-Json
$newVer = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString()
$versionData.version = $newVer
$versionData.updatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$versionData | ConvertTo-Json -Depth 5 | Set-Content -Path $versionFile -Encoding utf8

Write-Host "Generated GUI Version: $newVer"

$headers = @{
    "AccessKey" = $AccessKey
    "Content-Type" = "application/octet-stream"
}

function Send-ToBunny {
    param([string]$LocalFile, [string]$TargetName)
    if (Test-Path $LocalFile) {
        $dest = "$StorageBase/$TargetName"
        Write-Host "Uploading $TargetName..."
        $bytes = [System.IO.File]::ReadAllBytes($LocalFile)
        Invoke-RestMethod -Uri $dest -Method Put -Headers $headers -Body $bytes | Out-Null
        Write-Host "[OK] $TargetName uploaded."
    }
}

Send-ToBunny -LocalFile $cssFile -TargetName "gui-patch.css"
Send-ToBunny -LocalFile $jsFile -TargetName "gui-patch.js"
Send-ToBunny -LocalFile $versionFile -TargetName "gui-version.json"

Write-Host "SUCCESS! Live GUI Update v$newVer is now published to BunnyCDN."
Write-Host "All standalone apps will load this new design automatically."
