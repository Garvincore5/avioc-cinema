$apiKey = "936d5fc0-203e-4995-8943a1e59562-03d4-4923"
$storageBase = "https://storage.bunnycdn.com/aviocwatch/movies"

$items = @(
    # Weapons 2025
    @{ Local = "E:\downloads\others\Weapons.2025.720 VJ JUNIOR@katflix..mp4"; Remote = "$storageBase/weapons_2025_vj_junior.mp4" },

    # The Pendragon Cycle
    @{ Local = "E:\downloads\others\The_Pendragon_Cycle_Rise_of_the_Merlin_S01_E01_VJ_NELLY_2026.mp4"; Remote = "$storageBase/pendragon_cycle_s01e01.mp4" },

    # Oh My Baby
    @{ Local = "E:\downloads\others\Oh My Baby - S01E01 - When It's Too Late.mp4"; Remote = "$storageBase/oh_my_baby_s01e01.mp4" },
    @{ Local = (Get-ChildItem -Path "E:\downloads\others" -Filter "*Oh-My-Baby-S01E02*")[0].FullName; Remote = "$storageBase/oh_my_baby_s01e02.mp4" },

    # A Different World (eps 1 to 5)
    @{ Local = "E:\downloads\s0_sr_a-different-world_eps_S01E01.mp4"; Remote = "$storageBase/a_different_world_s01e01.mp4" },
    @{ Local = "E:\downloads\s0_sr_a-different-world_eps_S01E02.mp4"; Remote = "$storageBase/a_different_world_s01e02.mp4" },
    @{ Local = "E:\downloads\s0_sr_a-different-world_eps_S01E03.mp4"; Remote = "$storageBase/a_different_world_s01e03.mp4" },
    @{ Local = "E:\downloads\s0_sr_a-different-world_eps_S01E04.mp4"; Remote = "$storageBase/a_different_world_s01e04.mp4" },
    @{ Local = "E:\downloads\s0_sr_a-different-world_eps_S01E05.mp4"; Remote = "$storageBase/a_different_world_s01e05.mp4" },

    # Shaka Zulu (eps 1 to 7)
    @{ Local = "E:\downloads\shaka zulu\SHAKA Zulu - Ep. 01 (720p BluRay).mp4"; Remote = "$storageBase/shaka_zulu_ep01.mp4" },
    @{ Local = "E:\downloads\shaka zulu\SHAKA Zulu - Ep. 02 (720p BluRay).mp4"; Remote = "$storageBase/shaka_zulu_ep02.mp4" },
    @{ Local = "E:\downloads\shaka zulu\SHAKA Zulu - Ep. 03 (720p BluRay).mp4"; Remote = "$storageBase/shaka_zulu_ep03.mp4" },
    @{ Local = "E:\downloads\shaka zulu\SHAKA Zulu - Ep. 04 (720p BluRay).mp4"; Remote = "$storageBase/shaka_zulu_ep04.mp4" },
    @{ Local = "E:\downloads\shaka zulu\SHAKA Zulu - Ep. 05 (720p BluRay).mp4"; Remote = "$storageBase/shaka_zulu_ep05.mp4" },
    @{ Local = "E:\downloads\shaka zulu\SHAKA Zulu - Ep. 06 (720p BluRay).mp4"; Remote = "$storageBase/shaka_zulu_ep06.mp4" },
    @{ Local = "E:\downloads\shaka zulu\SHAKA Zulu - Ep. 07 (720p BluRay).mp4"; Remote = "$storageBase/shaka_zulu_ep07.mp4" },

    # I Will Find You (eps 1 to 8)
    @{ Local = "E:\downloads\New folder\I WILL FIND YOU S01.E01.JR.2026.mkv"; Remote = "$storageBase/i_will_find_you_s01e01.mp4" },
    @{ Local = "E:\downloads\New folder\I WILL FIND YOU S01.E02.JR.2026.mkv"; Remote = "$storageBase/i_will_find_you_s01e02.mp4" },
    @{ Local = "E:\downloads\New folder\I WILL FIND YOU S01.E03.JR.2026.mkv"; Remote = "$storageBase/i_will_find_you_s01e03.mp4" },
    @{ Local = "E:\downloads\New folder\I WILL FIND YOU S01.E04.JR.2026.mkv"; Remote = "$storageBase/i_will_find_you_s01e04.mp4" },
    @{ Local = "E:\downloads\New folder\I WILL FIND YOU S01.E05.JR.2026.mkv"; Remote = "$storageBase/i_will_find_you_s01e05.mp4" },
    @{ Local = "E:\downloads\New folder\I WILL FIND YOU S01.E06.JR.2026.mkv"; Remote = "$storageBase/i_will_find_you_s01e06.mp4" },
    @{ Local = "E:\downloads\New folder\I WILL FIND YOU S01.E07.JR.2026.mkv"; Remote = "$storageBase/i_will_find_you_s01e07.mp4" },
    @{ Local = "E:\downloads\New folder\I WILL FIND YOU S01.E08.JR.2026.mkv"; Remote = "$storageBase/i_will_find_you_s01e08.mp4" }
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

Write-Host "All remaining items uploaded!"
