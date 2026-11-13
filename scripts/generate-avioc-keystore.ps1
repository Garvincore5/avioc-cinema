# ==============================================================================
# Avioc Cinema — Official Code Signing & Keystore Generator (PowerShell)
# ==============================================================================
param(
    [string]$KeystorePass = "avioc2026cinema",
    [string]$Alias = "avioc",
    [string]$OutputDir = $PSScriptRoot
)

$ErrorActionPreference = "Stop"

Write-Host "=== Avioc Cinema Code Signing Setup ===" -ForegroundColor Cyan

# 1. Android Keystore (.jks)
$keystorePath = Join-Path $OutputDir "avioc-release-key.jks"
$keytool = Get-Command keytool -ErrorAction SilentlyContinue

if ($keytool) {
    Write-Host "[1/2] Generating Android Keystore: $keystorePath" -ForegroundColor Green
    if (Test-Path $keystorePath) {
        Remove-Item $keystorePath -Force
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

# 2. Windows Code Signing Certificate (.pfx)
$pfxPath = Join-Path $OutputDir "avioc-code-signing.pfx"
Write-Host "[2/2] Generating Windows Code Signing Certificate: $pfxPath" -ForegroundColor Green

$secPass = ConvertTo-SecureString $KeystorePass -AsPlainText -Force
$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=Avioc, O=Avioc Cinema, OU=Avioc Media, C=UG" -CertStoreLocation "Cert:\CurrentUser\My" -NotAfter (Get-Date).AddYears(10)

Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $secPass | Out-Null

Write-Host "[OK] Windows Code Signing Certificate created: $pfxPath" -ForegroundColor Green
Write-Host "Thumbprint: $($cert.Thumbprint)" -ForegroundColor DarkCyan
Write-Host "Author: Avioc (Avioc Cinema)" -ForegroundColor Green
