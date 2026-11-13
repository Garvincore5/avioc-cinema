$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$root = $PSScriptRoot
$manifestPath = Join-Path $root 'poster_sources.json'
$posterDir = Join-Path $root 'assets\posters'
New-Item -ItemType Directory -Path $posterDir -Force | Out-Null

$manifestJson = Get-Content -LiteralPath $manifestPath -Encoding UTF8 -Raw
$manifestValue = ConvertFrom-Json -InputObject $manifestJson
if ($manifestValue -is [array] -and $manifestValue.Count -eq 1 -and $manifestValue[0] -is [array]) { $manifestValue = $manifestValue[0] }
$manifest = @($manifestValue)
$failures = @()

foreach ($entry in $manifest) {
    $destination = Join-Path $posterDir $entry.file
    try {
        if (Test-Path -LiteralPath $destination) {
            $existing = Get-Item -LiteralPath $destination
            if ($existing.Length -ge 5000) {
                Write-Output "Already present $($entry.id) ($([math]::Round($existing.Length / 1KB)) KB)."
                continue
            }
        }
        Invoke-WebRequest -Uri $entry.url -OutFile $destination -Headers @{ 'User-Agent' = 'AviocCinemaPosterFetcher/1.0' } -MaximumRedirection 8
        $item = Get-Item -LiteralPath $destination
        if ($item.Length -lt 5000) { throw "Downloaded response is unexpectedly small ($($item.Length) bytes)." }
        Write-Output "Downloaded $($entry.id) ($([math]::Round($item.Length / 1KB)) KB)."
    } catch {
        Remove-Item -LiteralPath $destination -Force -ErrorAction SilentlyContinue
        $failures += [pscustomobject]@{ id = $entry.id; error = $_.Exception.Message }
        Write-Output "Failed $($entry.id): $($_.Exception.Message)"
    }
}

if ($failures.Count) {
    $failures | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path $root 'poster_download_failures.json') -Encoding utf8
    exit 1
}
Write-Output "Downloaded all $($manifest.Count) posters to assets/posters/."
