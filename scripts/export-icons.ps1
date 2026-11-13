# Export Avioc Cinema icons
param (
    [string]$SourceImage = "assets/icons/avioc_cinema_app_icon_v2_1792994268100.jpg"
)

Add-Type -AssemblyName System.Drawing

function Resize-And-Save($srcPath, $destPath, $size) {
    $srcImg = [System.Drawing.Image]::FromFile($srcPath)
    $destBmp = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($destBmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $graphics.DrawImage($srcImg, 0, 0, $size, $size)
    $destBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $graphics.Dispose()
    $destBmp.Dispose()
    $srcImg.Dispose()
    Write-Host "Exported: $destPath ($($size)x$($size))"
}

# Generate 192x192 and 512x512 preview candidate files in assets/icons
Resize-And-Save $SourceImage "assets/icons/app-icon-192.png" 192
Resize-And-Save $SourceImage "assets/icons/app-icon-512.png" 512
