$ErrorActionPreference = "Continue"
$accessKey = "936d5fc0-203e-4995-8943a1e59562-03d4-4923"
$storageBase = "https://storage.bunnycdn.com/aviocwatch"
$logFile = "e:\code\avioc cinema\upload_log.txt"
$statusFile = "e:\code\avioc cinema\upload_status.json"

function Log-Msg($msg) {
    $time = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $line = "[$time] $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

Log-Msg "=== Avioc Cinema Curl-Streaming Background Uploader Started ==="

# Get existing sizes
$headers = @{ "AccessKey" = $accessKey }
$existingSizes = @()
try {
    $existing = Invoke-RestMethod -Uri "$storageBase/movies/" -Method Get -Headers $headers
    foreach ($item in $existing) {
        $existingSizes += [int64]$item.Length
    }
    Log-Msg "Found $($existingSizes.Count) existing files in /movies/ on BunnyCDN."
} catch {
    Log-Msg "Warning: Could not fetch existing files: $_"
}

# Candidate files
$candidates = @(
    "E:\downloads\meet joe black.mp4",
    "E:\downloads\others\SHEEP_DETECTIVES_EMMY.mp4",
    "E:\downloads\others\LOVE ME LOVE ME VJ.SOUL.2026.mp4",
    "E:\downloads\others\Spider-Man_Far_From_Home_VJ_Junior.mp4",
    "E:\downloads\others\DRISHYAM_ULIO.mp4",
    "E:\downloads\others\After the Wedding by Vj Junior.mp4",
    "E:\downloads\others\The_Fix_part_2_VJ_Junior.mp4",
    "E:\downloads\others\Ittefaq_VJ_Ulio.mp4",
    "E:\downloads\others\Luck-Key_VJ_Ulio.mp4",
    "E:\downloads\others\A_Day_VJ_Ulio.mp4",
    "E:\downloads\others\The Comeback .720 Vj JUNIOR.mp4",
    "E:\downloads\others\Bikini_Model_Academy_VJ_Soul.mp4",
    "E:\downloads\others\One_Night_Only_VJ_Junior.mp4",
    "E:\downloads\others\The_Love_Hypothesis_VJ_Junior.mp4",
    "E:\downloads\others\Eagle_Eye_VJ_Junior.mp4",
    "E:\downloads\others\The_Pursuit_of_Happyness_VJ_Ulio.mp4",
    "E:\downloads\others\Weapons.2025.720 VJ JUNIOR@katflix..mp4",
    "E:\downloads\others\Just_My_Luck_VJ_Soul.mp4"
)

$todo = @()
foreach ($filePath in $candidates) {
    if (Test-Path $filePath) {
        $fi = Get-Item $filePath
        if ($existingSizes -contains $fi.Length) {
            Log-Msg "Already posted on Bunny: $($fi.Name) ($([math]::Round($fi.Length/1MB,1)) MB)"
        } else {
            $todo += $fi
        }
    }
}

# Sort smallest first
$todo = $todo | Sort-Object Length

Log-Msg "Total unposted files queued for upload: $($todo.Count)"

$currentIndex = 0
foreach ($fi in $todo) {
    $currentIndex++
    $cleanName = ($fi.Name -replace '[^a-zA-Z0-9_\-\.]', '_').ToLower()
    $uploadUri = "$storageBase/movies/$cleanName"
    $fileSizeMB = [math]::Round($fi.Length / 1MB, 1)

    $statusObj = @{
        currentFile = $fi.Name
        cleanName = $cleanName
        fileSizeMB = $fileSizeMB
        progress = "$currentIndex of $($todo.Count)"
        status = "Uploading"
        startTime = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }
    $statusObj | ConvertTo-Json | Set-Content -Path $statusFile

    Log-Msg "Uploading ($currentIndex/$($todo.Count)): $($fi.Name) ($fileSizeMB MB) to $uploadUri..."
    
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $curlOutput = & curl.exe -s -w "\n%{http_code}" -X PUT $uploadUri -H "AccessKey: $accessKey" -H "Content-Type: video/mp4" --upload-file $fi.FullName
    $sw.Stop()
    
    $sec = [math]::Round($sw.Elapsed.TotalSeconds, 1)
    Log-Msg "Finished $($fi.Name) in $sec s. Output: $curlOutput"
}

$statusObj = @{
    currentFile = "None"
    status = "Completed All Queued Uploads"
    completionTime = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
}
$statusObj | ConvertTo-Json | Set-Content -Path $statusFile
Log-Msg "=== All background uploads finished! ==="
