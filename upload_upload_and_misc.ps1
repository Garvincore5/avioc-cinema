$apiKey = "936d5fc0-203e-4995-8943a1e59562-03d4-4923"
$storageBase = "https://storage.bunnycdn.com/aviocwatch/movies"

$items = @(
    # Upload Season 1
    @{ Local = "E:\downloads\upload\s1&2\Watch Upload Season 1 - Free Episodes Tv Shows - cinejoy.mp4"; Remote = "$storageBase/upload_s01e01.mp4" },
    @{ Local = "E:\downloads\upload\s1&2\Watch Upload Season 1 - Free Episodes Tv Shows - cinejoy (2).mp4"; Remote = "$storageBase/upload_s01e02.mp4" },
    @{ Local = "E:\downloads\upload\s1&2\Watch Upload Season 1 - Free Episodes Tv Shows - cinejoy (3).mp4"; Remote = "$storageBase/upload_s01e03.mp4" },
    @{ Local = "E:\downloads\upload\s1&2\Watch Upload Season 1 - Free Episodes Tv Shows - cinejoy (4).mp4"; Remote = "$storageBase/upload_s01e04.mp4" },
    @{ Local = "E:\downloads\upload\s1&2\Watch Upload Season 1 - Free Episodes Tv Shows - cinejoy (5).mp4"; Remote = "$storageBase/upload_s01e05.mp4" },

    # Upload Season 2
    @{ Local = "E:\downloads\upload\s1&2\Watch Upload Season 2 - Free Episodes _ Tv Shows - cinejoy.mp4"; Remote = "$storageBase/upload_s02e01.mp4" },
    @{ Local = "E:\downloads\upload\s1&2\Watch Upload Season 2 - Free Episodes _ Tv Shows - cinejoy (1).mp4"; Remote = "$storageBase/upload_s02e02.mp4" },
    @{ Local = "E:\downloads\upload\s1&2\Watch Upload Season 2 - Free Episodes _ Tv Shows - cinejoy (2).mp4"; Remote = "$storageBase/upload_s02e03.mp4" },
    @{ Local = "E:\downloads\upload\s1&2\Watch Upload Season 2 - Free Episodes _ Tv Shows - cinejoy (3).mp4"; Remote = "$storageBase/upload_s02e04.mp4" },
    @{ Local = "E:\downloads\upload\s1&2\Watch Upload Season 2 - Free Episodes _ Tv Shows - cinejoy (4).mp4"; Remote = "$storageBase/upload_s02e05.mp4" },
    @{ Local = "E:\downloads\upload\s1&2\Watch Upload Season 2 - Free Episodes _ Tv Shows - cinejoy (5).mp4"; Remote = "$storageBase/upload_s02e06.mp4" },
    @{ Local = "E:\downloads\upload\s1&2\Watch Upload Season 2 - Free Episodes _ Tv Shows - cinejoy (6).mp4"; Remote = "$storageBase/upload_s02e07.mp4" },
    @{ Local = "E:\downloads\upload\s1&2\Watch Upload Season 2 - Free Episodes _ Tv Shows - cinejoy (7).mp4"; Remote = "$storageBase/upload_s02e08.mp4" },

    # Upload Season 3
    @{ Local = "E:\downloads\upload\s3\Watch Upload Season 3 - Free Episodes _ Tv Shows - cinejoy.mp4"; Remote = "$storageBase/upload_s03e01.mp4" },
    @{ Local = "E:\downloads\upload\s3\Watch Upload Season 3 - Free Episodes _ Tv Shows - cinejoy (1).mp4"; Remote = "$storageBase/upload_s03e02.mp4" },
    @{ Local = "E:\downloads\upload\s3\Watch Upload Season 3 - Free Episodes _ Tv Shows - cinejoy (2).mp4"; Remote = "$storageBase/upload_s03e03.mp4" },
    @{ Local = "E:\downloads\upload\s3\Watch Upload Season 3 - Free Episodes _ Tv Shows - cinejoy (3).mp4"; Remote = "$storageBase/upload_s03e04.mp4" },
    @{ Local = "E:\downloads\upload\s3\Watch Upload Season 3 - Free Episodes _ Tv Shows - cinejoy (4).mp4"; Remote = "$storageBase/upload_s03e05.mp4" },
    @{ Local = "E:\downloads\upload\s3\Watch Upload Season 3 - Free Episodes _ Tv Shows - cinejoy (5).mp4"; Remote = "$storageBase/upload_s03e06.mp4" },
    @{ Local = "E:\downloads\upload\s3\Watch Upload Season 3 - Free Episodes _ Tv Shows - cinejoy (6).mp4"; Remote = "$storageBase/upload_s03e07.mp4" },

    # Upload Season 4
    @{ Local = "E:\downloads\upload\s4\Watch Upload Season 4 - Free Episodes _ Tv Shows - cinejoy.mp4"; Remote = "$storageBase/upload_s04e01.mp4" },
    @{ Local = "E:\downloads\upload\s4\Watch Upload Season 4 - Free Episodes _ Tv Shows - cinejoy (1).mp4"; Remote = "$storageBase/upload_s04e02.mp4" },
    @{ Local = "E:\downloads\upload\s4\Watch Upload Season 4 - Free Episodes _ Tv Shows - cinejoy (2).mp4"; Remote = "$storageBase/upload_s04e03.mp4" },
    @{ Local = "E:\downloads\upload\s4\Watch Upload Season 4 - Free Episodes _ Tv Shows - cinejoy (3).mp4"; Remote = "$storageBase/upload_s04e04.mp4" },

    # Root Misc Movies
    @{ Local = "E:\downloads\code.mp4"; Remote = "$storageBase/code.mp4" },
    @{ Local = "E:\downloads\m_mn_54734.mp4"; Remote = "$storageBase/m_mn_54734.mp4" }
)

Write-Host "Total items queued for streaming upload: $($items.Count)"

$count = 0
foreach ($it in $items) {
    $count++
    $local = $it.Local
    $remote = $it.Remote

    if (-not (Test-Path $local)) {
        Write-Host "[$count/$($items.Count)] File not found: $local"
        continue
    }

    $sizeMb = [math]::Round((Get-Item $local).Length / 1MB, 1)
    Write-Host "[$count/$($items.Count)] Uploading $([System.IO.Path]::GetFileName($local)) ($sizeMb MB)..."

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $out = curl.exe -s -w "%{http_code}" -X PUT -H "AccessKey: $apiKey" -H "Content-Type: application/octet-stream" --upload-file "$local" "$remote"
    $sw.Stop()

    Write-Host "  -> Done in $($sw.Elapsed.TotalSeconds)s (HTTP: $out)"
}

Write-Host "All Upload & misc items uploaded!"
