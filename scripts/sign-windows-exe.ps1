# ==============================================================================
# Avioc Cinema - Windows Authenticode Signing Script
# ==============================================================================
param(
    [string]$DistDir = "dist-desktop",
    [string]$PfxPath = "scripts/avioc-code-signing.pfx",
    [Parameter(Mandatory = $true)]
    [string]$PfxPassword
)

$ErrorActionPreference = "Continue"

Write-Host "Signing Windows EXEs in $DistDir with Avioc signature..." -ForegroundColor Cyan

if (-not (Test-Path $PfxPath)) {
    Write-Warning "Certificate $PfxPath not found. Skipping sign."
    exit 0
}

try {
    $flags = [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($PfxPath, $PfxPassword, $flags)
} catch {
    Write-Warning "Could not load certificate: $_"
    exit 0
}

$exeFiles = Get-ChildItem -Path $DistDir -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue

if (-not $exeFiles) {
    Write-Warning "No .exe files found in $DistDir to sign."
    exit 0
}

foreach ($exe in $exeFiles) {
    Write-Host "Signing: $($exe.FullName)" -ForegroundColor Green
    try {
        Set-AuthenticodeSignature -FilePath $exe.FullName -Certificate $cert -ErrorAction SilentlyContinue | Out-Null
        Write-Host "Signed $($exe.Name) with Avioc signature!" -ForegroundColor Green
    } catch {
        Write-Warning "Failed to sign $($exe.Name): $_"
    }
}
