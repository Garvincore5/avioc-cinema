# Generate resized icons for Avioc Cinema (USD Crisis) and Avioc Cinema Admin (Admin)
Add-Type -AssemblyName System.Drawing

function Resize-Image($srcPath, $dstPath, $size) {
    $fullSrc = (Resolve-Path $srcPath).Path
    $img = [System.Drawing.Image]::FromFile($fullSrc)
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $gfx.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $gfx.DrawImage($img, 0, 0, $size, $size)
    $bmp.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $gfx.Dispose()
    $bmp.Dispose()
    $img.Dispose()
    Write-Host "Created: $dstPath ($($size)x$($size))"
}

# 1. Avioc Cinema App Icons (USD Crisis)
Write-Host "--- Generating Avioc Cinema (USD Crisis) Icons ---"
Resize-Image "assets/icons/usd crisis.jpg" "icon-192.png" 192
Resize-Image "assets/icons/usd crisis.jpg" "icon-512.png" 512
Resize-Image "assets/icons/usd crisis.jpg" "assets/icons/app-icon-192.png" 192
Resize-Image "assets/icons/usd crisis.jpg" "assets/icons/app-icon-512.png" 512

# 2. Admin App Icons (Admin.jpg)
Write-Host "--- Generating Admin App Icons ---"
if (-not (Test-Path "admin")) { New-Item -ItemType Directory -Path "admin" }
Resize-Image "assets/icons/Admin.jpg" "admin/admin-icon-192.png" 192
Resize-Image "assets/icons/Admin.jpg" "admin/admin-icon-512.png" 512
Resize-Image "assets/icons/Admin.jpg" "assets/icons/admin-icon-192.png" 192
Resize-Image "assets/icons/Admin.jpg" "assets/icons/admin-icon-512.png" 512

Write-Host "Done!"
