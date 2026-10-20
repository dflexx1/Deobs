@echo off
chcp 65001 >nul 2>nul
setlocal enableextensions
title Lua Deobfuscator - Tum araclar
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [X] Node.js bulunamadi. https://nodejs.org adresinden Node.js 18+ kurun.
  echo.
  pause
  exit /b 1
)

echo.
echo   Bu mod TUM deobfuscator'lari sirayla dener.
echo   Her aracin ciktisi ayri dosyaya yazilir: ad.deob.^<arac^>.lua
echo.
echo   Not: Luraph ve Moonveil scripti sandbox'ta calistirir, yavas olabilir.
echo.

if "%~1"=="" goto :ask

node "%~dp0tools\deob.js" %* --all
set "RC=%ERRORLEVEL%"
goto :finish

:ask
set "TARGET="
set /p "TARGET=Dosya veya klasor yolu (bos birak = cikis): "
if not defined TARGET exit /b 0
node "%~dp0tools\deob.js" "%TARGET%" --all
set "RC=%ERRORLEVEL%"

:finish
echo.
if "%RC%"=="0" (
  echo   Bitti.
) else (
  echo   Bitti - hicbir arac sonuc uretemedi ^(kod %RC%^).
)
echo.
pause
endlocal
