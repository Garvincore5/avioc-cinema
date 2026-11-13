Add-Type -AssemblyName System.Drawing

$postersDir = Join-Path $PSScriptRoot "..\assets\posters"
$socialDir  = Join-Path $PSScriptRoot "..\assets\social"

if (!(Test-Path $socialDir)) {
    New-Item -ItemType Directory -Force -Path $socialDir | Out-Null
}

$files = Get-ChildItem -Path $postersDir -File
$count = 0
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }

foreach ($f in $files) {
    $outPath = Join-Path $socialDir ($f.BaseName + ".jpg")
    try {
        $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
        $ms = New-Object System.IO.MemoryStream($bytes, $false)
        $img = [System.Drawing.Image]::FromStream($ms)
        $w = $img.Width
        $h = $img.Height
        
        $targetW = [Math]::Min(600, $w)
        $targetH = [int](($targetW / $w) * $h)
        if ($targetH -lt 1) { $targetH = 1 }
        
        $bmp = New-Object System.Drawing.Bitmap($targetW, $targetH)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.DrawImage($img, 0, 0, $targetW, $targetH)
        
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]80)
        
        $bmp.Save($outPath, $jpegCodec, $encoderParams)
        
        $encoderParams.Dispose()
        $g.Dispose()
        $bmp.Dispose()
        $img.Dispose()
        $ms.Dispose()
        $count++
    } catch {
        Write-Host "Error processing $($f.Name): $($_.Exception.Message)"
    }
}

Write-Host "Successfully generated $count social thumbnails in assets/social/"
