# ==============================================================================
# Avioc Cinema — Android release keystore generator (PowerShell)
# ==============================================================================
param(
    [Parameter(Mandatory = $true)]
    [string]$KeystorePass,
    [string]$Alias = "avioc",
    [string]$OutputDir = $PSScriptRoot
)

$ErrorActionPreference = "Stop"

Write-Host "=== Avioc Cinema Android Signing Key Setup ===" -ForegroundColor Cyan

$keystorePath = Join-Path $OutputDir "avioc-release-key.jks"
$keytool = Get-Command keytool -ErrorAction SilentlyContinue

if ($keytool) {
    Write-Host "Generating Android Keystore: $keystorePath" -ForegroundColor Green
    if (Test-Path $keystorePath) {
        throw "Keystore already exists. It may be the key used for published app updates; do not overwrite it."
    }
    
    $dname = "CN=Avioc, OU=Avioc Cinema Media, O=Avioc Cinema, L=Kampala, ST=Central, C=UG"
    $ktArgs = @(
        "-genkey", "-v",
        "-keystore", $keystorePath,
        "-alias", $Alias,
        "-keyalg", "RSA",
        "-keysize", "2048",
        "-validity", "10000",
        "-storepass", $KeystorePass,
        "-keypass", $KeystorePass,
        "-dname", $dname
    )
    & keytool $ktArgs
    Write-Host "[OK] Android Keystore created successfully!" -ForegroundColor Green
} else {
    Write-Host "[INFO] keytool not installed locally. GitHub Actions will generate it automatically during build." -ForegroundColor Yellow
}

Write-Host "Keep this keystore backed up securely. Use the same key for all updates to this Android app." -ForegroundColor Yellow
