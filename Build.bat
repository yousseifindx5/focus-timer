@echo off
chcp 65001 >nul
title Focus Timer - Build
cd /d "%~dp0"

echo ==================================================
echo   Focus Timer - Windows Build
echo ==================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed. Install it from https://nodejs.org ^(LTS^) then run this file again.
  pause
  exit /b 1
)

echo [1/3] Installing dependencies...
call npm install
if errorlevel 1 goto :fail

echo.
echo [2/3] Building the app and creating the exe files...
call npm run dist:win
if errorlevel 1 goto :fail

echo.
echo [3/3] Collecting the final files...
if exist "Output" rmdir /s /q "Output"
mkdir "Output"
copy /y "release\Focus-Timer-Setup-*.exe" "Output\" >nul
copy /y "release\Focus-Timer-Portable-*.exe" "Output\" >nul

echo.
echo ==================================================
echo   DONE. Your final files are in the "Output" folder:
echo     Focus-Timer-Setup-x.x.x.exe      (installer - upload this to GitHub Releases)
echo     Focus-Timer-Portable-x.x.x.exe   (runs without installing)
echo.
echo   Ignore the "release" folder, it only holds temporary build files.
echo ==================================================
start "" "%~dp0Output"
pause
exit /b 0

:fail
echo.
echo [ERROR] Build failed. See the messages above.
echo If you see "Cannot create symbolic link": run this file as Administrator or enable Windows Developer Mode.
pause
exit /b 1
