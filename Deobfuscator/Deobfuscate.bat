@echo off
chcp 65001 >nul 2>nul
setlocal enableextensions
title Lua Deobfuscator
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [X] Node.js bulunamadi.
  echo     https://nodejs.org adresinden Node.js 18+ kurun, sonra tekrar deneyin.
  echo.
  pause
  exit /b 1
)

if "%~1"=="" goto :ask

node "%~dp0tools\deob.js" %*
set "RC=%ERRORLEVEL%"
goto :finish

:ask
echo.
echo   Lua dosyalarini bu dosyanin uzerine surukleyip birakin.
echo   Birden fazla dosya veya bir klasor de olur.
echo.
set "TARGET="
set /p "TARGET=Dosya yolu (bos birakip Enter = cikis): "
if not defined TARGET exit /b 0
node "%~dp0tools\deob.js" "%TARGET%"
set "RC=%ERRORLEVEL%"

:finish
echo.
if "%RC%"=="0" (
  echo   Bitti.
) else (
  echo   Bitti - bazi dosyalar cozulemedi ^(kod %RC%^).
)
echo.
pause
endlocal
