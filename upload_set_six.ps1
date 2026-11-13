$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$storageBase = 'https://storage.bunnycdn.com/aviocwatch/movies'
$manifestPath = Join-Path $root 'set_six_manifest.json'
$statusPath = Join-Path $root 'upload_set_six_status.json'
$logPath = Join-Path $root 'upload_set_six_log.txt'
$responsePath = Join-Path $env:TEMP 'avioc-bunny-upload-set6-response.tmp'

function Write-UploadLog([string]$Message) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
    Write-Output $line
    Add-Content -LiteralPath $logPath -Value $line
}

function Save-UploadStatus($Value) {
    $Value | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $statusPath -Encoding utf8
}

try {
    $accessKey = "936d5fc0-203e-4995-8943a1e59562-03d4-4923"

    $manifestJson = Get-Content -LiteralPath $manifestPath -Encoding UTF8 -Raw
    $manifestValue = ConvertFrom-Json -InputObject $manifestJson
    if ($manifestValue -is [array] -and $manifestValue.Count -eq 1 -and $manifestValue[0] -is [array]) {
        $manifestValue = $manifestValue[0]
    }
    $manifest = @($manifestValue)
    Write-UploadLog "Loaded manifest from $manifestPath (count $($manifest.Count))."
    if ($manifest.Count -ne 18) { throw "Manifest count mismatch: expected 18, found $($manifest.Count)." }

    $files = foreach ($entry in $manifest) {
        $localPath = Join-Path $entry.sourceDir $entry.source
        if (-not (Test-Path -LiteralPath $localPath -PathType Leaf)) { throw "Source file missing: $($entry.source)" }
        [pscustomobject]@{ Source = $entry.source; Remote = $entry.remote; Mime = $entry.mime; FullName = $localPath; Length = (Get-Item -LiteralPath $localPath).Length }
    }

    if (@($files.Remote | Sort-Object -Unique).Count -ne $files.Count) { throw 'Manifest contains duplicate Bunny destination names.' }
    Write-UploadLog "Checking Bunny storage for $($files.Count) files before upload."
    $headers = @{ AccessKey = $accessKey }
    $existing = @(Invoke-RestMethod -Uri "$storageBase/" -Method Get -Headers $headers)
    if ($existing.Count -eq 1 -and $existing[0] -is [array]) { $existing = @($existing[0]) }
    $remoteByName = @{}
    foreach ($item in $existing) { if (-not $item.IsDirectory) { $remoteByName[$item.ObjectName] = [int64]$item.Length } }

    $confirmedUploads = @{}
    if (Test-Path -LiteralPath $logPath) {
        foreach ($line in Get-Content -LiteralPath $logPath) {
            $match = [regex]::Match($line, 'Uploaded successfully: ([^ ]+) \(HTTP 201\)')
            if ($match.Success) { $confirmedUploads[$match.Groups[1].Value] = $true }
        }
    }

    foreach ($file in $files) {
        if ($remoteByName.ContainsKey($file.Remote) -and $remoteByName[$file.Remote] -ne $file.Length -and -not $confirmedUploads.ContainsKey($file.Remote)) {
            throw "Destination exists with a different size; refusing to overwrite: $($file.Remote)"
        }
    }

    $queue = @($files | Sort-Object Length)
    $done = 0
    foreach ($file in $queue) {
        $done++
        if (($remoteByName.ContainsKey($file.Remote) -and $remoteByName[$file.Remote] -eq $file.Length) -or $confirmedUploads.ContainsKey($file.Remote)) {
            Write-UploadLog "[$done/$($queue.Count)] Already present at matching size: $($file.Remote)"
            Save-UploadStatus @{ status = 'Uploading'; completed = $done; total = $queue.Count; currentFile = $file.Source; skipped = $file.Remote }
            continue
        }

        $sizeMB = [math]::Round($file.Length / 1MB, 1)
        Write-UploadLog "[$done/$($queue.Count)] Uploading $($file.Source) -> $($file.Remote) ($sizeMB MB)..."
        Save-UploadStatus @{ status = 'Uploading'; completed = ($done - 1); total = $queue.Count; currentFile = $file.Source; destination = $file.Remote; sizeBytes = $file.Length }
        Remove-Item -LiteralPath $responsePath -Force -ErrorAction SilentlyContinue
        $codeText = & curl.exe --globoff --silent --show-error --fail --output $responsePath --write-out '%{http_code}' --retry 3 --retry-all-errors --request PUT --header "AccessKey: $accessKey" --header "Content-Type: $($file.Mime)" --upload-file $file.FullName "$storageBase/$($file.Remote)"
        $curlExit = $LASTEXITCODE
        $httpCode = [string]$codeText
        if ($curlExit -ne 0 -or $httpCode -notin @('200', '201')) {
            $body = if (Test-Path -LiteralPath $responsePath) { Get-Content -LiteralPath $responsePath -Raw } else { '' }
            throw "Upload failed for $($file.Source) (curl $curlExit, HTTP $httpCode): $body"
        }
        $remoteByName[$file.Remote] = $file.Length
        Write-UploadLog "[$done/$($queue.Count)] Uploaded successfully: $($file.Remote) (HTTP $httpCode)."
        Save-UploadStatus @{ status = 'Uploading'; completed = $done; total = $queue.Count; currentFile = $file.Source; uploaded = $file.Remote }
    }

    Write-UploadLog 'Verifying uploaded filenames and lengths on Bunny.'
    $verifiedListing = @(Invoke-RestMethod -Uri "$storageBase/" -Method Get -Headers $headers)
    if ($verifiedListing.Count -eq 1 -and $verifiedListing[0] -is [array]) { $verifiedListing = @($verifiedListing[0]) }
    $verified = @{}
    foreach ($item in $verifiedListing) { if (-not $item.IsDirectory) { $verified[$item.ObjectName] = [int64]$item.Length } }
    $missing = @($files | Where-Object { -not $verified.ContainsKey($_.Remote) -or $verified[$_.Remote] -ne $_.Length })
    if ($missing.Count) { throw "Verification failed for: $(($missing.Remote) -join ', ')" }

    Save-UploadStatus @{ status = 'Completed'; completed = $files.Count; total = $files.Count; completedAt = (Get-Date).ToString('s'); verified = $true }
    Write-UploadLog "Complete: all $($files.Count) files are present on Bunny with matching sizes."
} catch {
    Save-UploadStatus @{ status = 'Failed'; error = $_.Exception.Message; failedAt = (Get-Date).ToString('s') }
    Write-UploadLog "FAILED: $($_.Exception.Message)"
    exit 1
} finally {
    Remove-Item -LiteralPath $responsePath -Force -ErrorAction SilentlyContinue
}
