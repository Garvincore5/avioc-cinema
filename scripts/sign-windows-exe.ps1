# ==============================================================================
# Avioc Cinema — Windows Authenticode Signing Script
# ==============================================================================
param(
    [string]$DistDir = "dist-desktop",
    [string]$PfxPath = "scripts/avioc-code-signing.pfx",
    [string]$PfxPassword = "avioc2026cinema"
)

$ErrorActionPreference = "Continue"

Write-Host "Signing Windows EXEs in $DistDir with Avioc signature..." -ForegroundColor Cyan

if (-not (Test-Path $PfxPath)) {
    Write-Warning "Certificate $PfxPath not found. Generating now..."
    & "$PSScriptRoot/generate-avioc-keystore.ps1"
}

$secPass = ConvertTo-SecureString $PfxPassword -AsPlainText -Force

$exeFiles = Get-ChildItem -Path $DistDir -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue

if (-not $exeFiles) {
    Write-Warning "No .exe files found in $DistDir to sign."
    exit 0
}

foreach ($exe in $exeFiles) {
    Write-Host "Signing: $($exe.FullName)" -ForegroundColor Green
    try {
        Set-AuthenticodeSignature -FilePath $exe.FullName -Certificate (Get-PfxCertificate -FilePath $PfxPath) -TimestampServer "http://timestamp.digicert.com"
        Write-Host "✓ Successfully signed $($exe.Name) with Avioc signature!" -ForegroundColor Green
    } catch {
        Write-Warning "Failed to sign $($exe.Name): $_"
    }
}
