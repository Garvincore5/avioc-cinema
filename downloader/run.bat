@echo off
title VIDOR - Universal Media Downloader
cd /d "%~dp0"
echo ========================================================
echo   VIDOR - UNIVERSAL VIDEO & MUSIC DOWNLOADER
echo ========================================================
echo.
echo Starting Vidor Server...
echo Open your browser at: http://localhost:5000
echo.
py app.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Trying python launcher...
    python app.py
)
pause
