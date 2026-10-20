@echo off
chcp 65001 >nul 2>nul
setlocal enableextensions
title Lua Deobfuscator
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto :nonode

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
goto :finish

:nonode
echo.
echo ==========================================================
echo   Node.js bulunamadi - deobfuscator'lar calisamaz.
echo ==========================================================
echo.
echo   Bu araclar Node.js 18+ gerektirir ^(zorunlu^).
echo   Kurmak icin:  https://nodejs.org  -^> "LTS" surumu
echo   veya:         winget install OpenJS.NodeJS.LTS
echo.
echo   Kurulum.bat bu kontrolu ve diger eksikleri yapar.
echo.
set "ANS="
set /p "ANS=   Kurulum.bat simdi calistirilsin mi? (E/H): "
if /i "%ANS%"=="E" (
  call "%~dp0Kurulum.bat"
)
echo.
echo   Kurulumdan sonra bu pencereyi KAPATIP yeniden acin.
echo.
pause
exit /b 1

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
