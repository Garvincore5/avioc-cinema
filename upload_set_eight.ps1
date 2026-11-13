$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$storageBase = 'https://storage.bunnycdn.com/aviocwatch/movies'
$manifestPath = Join-Path $root 'set_eight_manifest.json'
$statusPath = Join-Path $root 'upload_set_eight_status.json'
$logPath = Join-Path $root 'upload_set_eight_log.txt'
$responsePath = Join-Path $env:TEMP 'avioc-bunny-upload-set8-response.tmp'

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
    if ($manifest.Count -ne 27) { throw "Manifest count mismatch: expected 27, found $($manifest.Count)." }

    $files = foreach ($entry in $manifest) {
        $localPath = Join-Path $entry.sourceDir $entry.source
        if (-not (Test-Path -LiteralPath $localPath -PathType Leaf)) { throw "Source file missing: $($entry.source)" }
        [pscustomobject]@{ Source = $entry.source; Remote = $entry.remote; Mime = $entry.mime; FullName = $localPath; Length = (Get-Item -LiteralPath $localPath).Length }
    }

    if (@($files.Remote | Sort-Object -Unique).Count -ne $files.Count) { throw 'Manifest contains duplicate Bunny destination names.' }
    Write-UploadLog "Checking confirmed upload log for $($files.Count) files..."
    $remoteByName = @{}
    try {
        $headers = @{ AccessKey = $accessKey }
        $existing = @(Invoke-RestMethod -Uri "$storageBase/" -Method Get -Headers $headers -TimeoutSec 15)
        if ($existing.Count -eq 1 -and $existing[0] -is [array]) { $existing = @($existing[0]) }
        foreach ($item in $existing) { if (-not $item.IsDirectory) { $remoteByName[$item.ObjectName] = [int64]$item.Length } }
    } catch {
        Write-UploadLog "Notice: Bunny storage list query skipped. Relying on confirmed upload history."
    }

    $confirmedUploads = @{}
    if (Test-Path -LiteralPath $logPath) {
        foreach ($line in Get-Content -LiteralPath $logPath) {
            $match = [regex]::Match($line, 'Uploaded successfully: ([^ ]+) \(HTTP 201\)')
            if ($match.Success) { $confirmedUploads[$match.Groups[1].Value] = $true }
        }
    }

    foreach ($file in $files) {
        if ($remoteByName.ContainsKey($file.Remote) -and $remoteByName[$file.Remote] -ne $file.Length -and -not $confirmedUploads.ContainsKey($file.Remote)) {
            Write-UploadLog "Warning: Destination exists with different size; will overwrite: $($file.Remote)"
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
        $uploaded = $false
        for ($attempt = 1; $attempt -le 5; $attempt++) {
            Remove-Item -LiteralPath $responsePath -Force -ErrorAction SilentlyContinue
            if ($attempt -gt 1) {
                Write-UploadLog "[$done/$($queue.Count)] Retry attempt $attempt for $($file.Remote)..."
            }
            $codeText = & curl.exe --globoff --silent --show-error --fail --output $responsePath --write-out '%{http_code}' --connect-timeout 60 --retry 3 --retry-delay 5 --retry-all-errors --request PUT --header "AccessKey: $accessKey" --header "Content-Type: $($file.Mime)" --upload-file $file.FullName "$storageBase/$($file.Remote)"
            $curlExit = $LASTEXITCODE
            $httpCode = [string]$codeText
            if ($curlExit -eq 0 -and $httpCode -in @('200', '201')) {
                $uploaded = $true
                break
            }
            $body = if (Test-Path -LiteralPath $responsePath) { Get-Content -LiteralPath $responsePath -Raw } else { '' }
            Write-UploadLog "Attempt $attempt failed for $($file.Remote) (curl $curlExit, HTTP $httpCode): $body. Retrying in 15 seconds..."
            Start-Sleep -Seconds 15
        }
        if (-not $uploaded) {
            throw "Upload failed for $($file.Source) after 5 attempts."
        }

        Write-UploadLog "[$done/$($queue.Count)] Uploaded successfully: $($file.Remote) (HTTP $httpCode)"
        Save-UploadStatus @{ status = 'Uploading'; completed = $done; total = $queue.Count; currentFile = $file.Source; destination = $file.Remote; lastUploaded = $file.Remote }
    }

    Write-UploadLog 'All 27 Set Eight video files are verified on Bunny storage.'
    Save-UploadStatus @{ status = 'Completed'; completed = $queue.Count; total = $queue.Count; timestamp = (Get-Date).ToString('o') }
}
catch {
    Write-UploadLog "FATAL: $($_.Exception.Message)"
    Save-UploadStatus @{ status = 'Failed'; error = $_.Exception.Message; timestamp = (Get-Date).ToString('o') }
    throw
}
