@echo off
set "PATH=C:\Users\user\AppData\Local\PortableGit\cmd;C:\Users\user\AppData\Local\PortableGit\mingw64\bin;%PATH%"
title Pushing Avioc Cinema to GitHub...
echo ========================================================
echo   Pushing Avioc Cinema to GitHub (Garvincore5/avioc-cinema)
echo ========================================================
echo.

"C:\Users\user\AppData\Local\PortableGit\cmd\git.exe" --git-dir="C:\Users\user\AppData\Local\avioc-git" --work-tree="E:\code\avioc cinema" push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Code pushed to GitHub! The GitHub Actions build has started!
) else (
    echo [NOTICE] If GitHub asked you to sign in, please complete the sign-in prompt.
)
echo.
pause
