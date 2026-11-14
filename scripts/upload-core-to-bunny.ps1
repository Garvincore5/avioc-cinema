# Upload core files to BunnyCDN after each build
Set-Location "e:\code\avioc cinema"

$ACCESS_KEY = $env:BUNNY_STORAGE_ZONE_KEY
if (-not $ACCESS_KEY) { throw "Set BUNNY_STORAGE_ZONE_KEY in your environment before uploading." }
$BASE_URL   = "https://storage.bunnycdn.com/aviocwatch"

function Upload-File($localPath, $remotePath, $contentType) {
    $bytes = [System.IO.File]::ReadAllBytes($localPath)
    $headers = @{
        "AccessKey"    = $ACCESS_KEY
        "Content-Type" = $contentType
    }
    try {
        $result = Invoke-RestMethod -Uri "$BASE_URL/$remotePath" -Method Put -Headers $headers -Body $bytes
        Write-Host "OK  /$remotePath" -ForegroundColor Green
    } catch {
        Write-Host "ERR /$remotePath  $_" -ForegroundColor Red
    }
}

Write-Host "=== Uploading core files to BunnyCDN ===" -ForegroundColor Cyan

Upload-File "sw.js"           "sw.js"           "application/javascript"
Upload-File "manifest.json"   "manifest.json"   "application/manifest+json"
Upload-File "index.html"      "index.html"      "text/html; charset=utf-8"
Upload-File "cinema.html"     "cinema.html"     "text/html; charset=utf-8"

Write-Host ""
Write-Host "=== All done! Purge CDN cache if needed ===" -ForegroundColor Cyan
Write-Host "CDN: https://aviocwatch.b-cdn.net/" -ForegroundColor Yellow
