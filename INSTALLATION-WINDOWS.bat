@echo off
setlocal
cd /d "%~dp0"
title Emergency Delivery - Windows Installer
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 20+ wird zum Erstellen des Installers benoetigt.
  echo Download: https://nodejs.org/
  pause
  exit /b 1
)
echo.
echo Emergency Delivery - Windows Installer wird erstellt...
echo.
call npm install
if errorlevel 1 goto error
call npm run dist
if errorlevel 1 goto error
echo.
echo ==========================================
echo FERTIG!
echo Installer: %CD%\dist\Emergency-Delivery-Setup-2.0.7.exe
echo ==========================================
pause
exit /b 0
:error
echo.
echo BUILD FEHLGESCHLAGEN
pause
exit /b 1
