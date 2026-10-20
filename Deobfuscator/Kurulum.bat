@echo off
chcp 65001 >nul 2>nul
setlocal enableextensions enabledelayedexpansion
title Lua Deobfuscator - Kurulum
cd /d "%~dp0"

set "MISSING="
rem .NET 8 hedefli exe'lerin .NET 9 calisma zamaniyla da acilmasini saglar
set "DOTNET_ROLL_FORWARD=LatestMajor"

echo ==========================================================
echo   Lua Deobfuscator - kurulum / bagimlilik kontrolu
echo ==========================================================
echo   Klasor: %CD%
echo.

rem ================================================================
rem [0/6] Arac klasorleri
rem ================================================================
echo [0/6] Arac klasorleri ...
call :toolcheck
if defined TOOLS_MISSING (
  echo    Eksik ^(ilk bakista^):!TOOLS_MISSING!
  echo    Arsivden cikariliyor ...
  call :unpack
  call :toolcheck
)
if defined TOOLS_MISSING (
  echo.
  echo    [X] Su klasorler hala yok:!TOOLS_MISSING!
  echo.
  echo        Deobfuscator.rar dosyasina sag tik -^> "Buraya cikar"
  echo        ^(WinRAR / 7-Zip^) ve HEDEF olarak BU klasoru secin:
  echo          %CD%
  echo        Sonra Kurulum.bat'i yeniden calistirin.
) else (
  echo    OK   - tum arac klasorleri yerinde.
)
echo.

rem ================================================================
rem [1/6] Node.js  (zorunlu)
rem ================================================================
echo [1/6] Node.js ^(zorunlu^) ...
set "NODE_OK=0"
call :refresh_path
where node >nul 2>nul
if not errorlevel 1 set "NODE_OK=1"

if "%NODE_OK%"=="1" (
  for /f "delims=" %%v in ('node -v 2^>nul') do echo    OK   - Node %%v
) else (
  echo    YOK  - Node.js 18+ bulunamadi.
  call :install_node
  call :refresh_path
  where node >nul 2>nul
  if not errorlevel 1 set "NODE_OK=1"
  if "!NODE_OK!"=="1" (
    for /f "delims=" %%v in ('node -v 2^>nul') do echo    OK   - Node %%v
  ) else (
    echo    [X] Node.js hala yok. https://nodejs.org adresinden LTS surumu kurun.
    echo        Kurulum bitince bu pencereyi KAPATIP yeniden acin ^(PATH guncellensin^).
    set "MISSING=!MISSING! Node.js"
  )
)
echo.

rem ================================================================
rem [2/6] Python
rem ================================================================
echo [2/6] Python ^(Hercules / Luraph / Moonveil icin^) ...
set "PY_OK=0"
set "PY_CMD="
call :find_python
if "%PY_OK%"=="1" (
  echo    OK   - %PY_CMD%
) else (
  echo    YOK  - Python 3.10+ bulunamadi.
  call :install_python
  call :refresh_path
  call :find_python
  if "!PY_OK!"=="1" (
    echo    OK   - !PY_CMD!
  ) else (
    echo    [X] Python yok. Hercules / Luraph / Moonveil calismaz.
    echo        https://python.org -^> "Add python.exe to PATH" isaretli olsun.
    set "MISSING=!MISSING! Python"
  )
)
echo.

rem ================================================================
rem [3/6] .NET
rem ================================================================
echo [3/6] .NET ...
set "SDK_VER="
call :find_dotnet_sdk
if defined SDK_VER (
  echo    OK   - .NET SDK %SDK_VER%
) else (
  where dotnet >nul 2>nul
  if errorlevel 1 (
    echo    YOK  - dotnet bulunamadi ^(ne SDK ne runtime^).
  ) else (
    echo    YOK  - dotnet var ama SDK yok ^(sadece calisma zamani kurulu^).
  )
  echo    Moonsec ^(net9.0^) derlenemez; 77fuscator/IB2 calisma zamani ister.
  call :install_dotnet
  call :refresh_path
  call :find_dotnet_sdk
  if defined SDK_VER (
    echo    OK   - .NET SDK !SDK_VER!
  ) else (
    echo    [X] .NET SDK yok. https://dotnet.microsoft.com/download/dotnet/9.0
    echo        ".NET SDK 9" kurun; kurulumdan sonra pencereyi yeniden acin.
    set "MISSING=!MISSING! .NET SDK"
  )
)
echo.

rem ================================================================
rem [4/6] C# araclari
rem ================================================================
echo [4/6] C# araclari derleniyor ...
if not defined SDK_VER (
  echo    - SDK yok, derleme atlandi.
  goto :build_done
)
if exist "MoonsecDeobfuscator-master\MoonsecDeobfuscator.sln" (
  echo    - MoonsecDeobfuscator ^(net9.0^) ...
  dotnet build "MoonsecDeobfuscator-master\MoonsecDeobfuscator.sln" -c Release --nologo -v quiet
  if errorlevel 1 (
    echo      [X] Derleme basarisiz. .NET 9 SDK kurulu mu? Ayrintili hata:
    dotnet build "MoonsecDeobfuscator-master\MoonsecDeobfuscator.sln" -c Release --nologo -v minimal
  ) else (
    echo      OK
  )
) else (
  echo    - MoonsecDeobfuscator kaynagi yok, atlandi.
)

if exist "77fuscatorDeobfuscator-main\77fuscatorDeobfuscator-main\bin\Debug\net8.0\deobfuscator.exe" (
  echo    - 77fuscator hazir ^(paketteki exe^).
) else (
  if exist "77fuscatorDeobfuscator-main\77fuscatorDeobfuscator-main\deobfuscator.csproj" (
    echo    - 77fuscator ^(net8.0^) ...
    dotnet build "77fuscatorDeobfuscator-main\77fuscatorDeobfuscator-main\deobfuscator.csproj" -c Debug --nologo -v quiet
    if errorlevel 1 (
      echo      [X] Derleme basarisiz.
    ) else (
      echo      OK
    )
  )
)
:build_done
echo.

rem ================================================================
rem [5/6] Opsiyonel npm paketi
rem ================================================================
echo [5/6] Opsiyonel npm paketi ^(promdeobf / luau-web^) ...
if not "%NODE_OK%"=="1" (
  echo    Node.js yok, atlandi.
  goto :npm_done
)
where npm >nul 2>nul
if errorlevel 1 (
  echo    npm yok, atlandi.
  goto :npm_done
)
if exist "promdeobf\promdeobf\main.js" (
  pushd "promdeobf\promdeobf"
  call npm install luau-web --no-audit --no-fund --silent
  popd
  echo    luau-web denendi ^(promdeobf icin^).
) else (
  echo    promdeobf klasoru yok, atlandi.
)
:npm_done
echo.

rem ================================================================
rem [6/6] Durum
rem ================================================================
echo ==================== DURUM ====================
if "%NODE_OK%"=="1" (
  node "%~dp0tools\deob.js" --doctor
) else (
  echo  Node.js olmadan durum raporu alinamaz.
)

echo.
echo ==========================================================
if defined MISSING (
  echo  EKSIK BILESENLER:!MISSING!
  echo.
  echo  Bunlar olmadan ilgili araclar calismaz:
  echo    Node.js     -^> 6 JS araci + dagitici ^(zorunlu^)
  echo    Python      -^> Hercules, Luraph, Moonveil
  echo    .NET SDK    -^> Moonsec derlemesi; 77fuscator/IB2 calismasi
  echo.
  echo  Kurulumdan sonra bu pencereyi kapatip Kurulum.bat'i yeniden acin.
) else (
  echo  Her sey hazir. Deobfuscate.bat uzerine .lua dosyasi surukleyin.
)
echo ==========================================================
echo.
pause
endlocal
exit /b 0

rem ================================================================
rem Alt yordamlar
rem ================================================================

:toolcheck
set "TOOLS_MISSING="
call :need "Clyde"                   "ClydeDeobfuscator-main"
call :need "Ironveil"                "Ironveil-Deobfuscator-V1-main"
call :need "LuaObfuscator"           "LuaObfuscator-Deobfuscator-main"
call :need "Luraph"                  "Luraph_v15_1_Deobfuscator_Newest"
call :need "MoonSec-Bot"             "MoonSecV3_Deobfuscator_Bot_FULLY-1"
call :need "Moonsec"                 "MoonsecDeobfuscator-master"
call :need "Prometheus"              "Prometheus-Deobfuscator-main"
call :need "Hercules"                "hercules-deobfuscator-main"
call :need "IB2"                     "ib2-deobf"
call :need "Moonveil"                "moonveilvro-main"
call :need "promdeobf"               "promdeobf"
call :need "77fuscator"              "77fuscatorDeobfuscator-main"
exit /b 0

:need
if not exist "%~2" set "TOOLS_MISSING=!TOOLS_MISSING! %~1"
exit /b 0

:unpack
set "ARCHIVE="
if exist "Deobfuscator.rar"    set "ARCHIVE=%CD%\Deobfuscator.rar"
if not defined ARCHIVE if exist "..\Deobfuscator.rar" set "ARCHIVE=%CD%\..\Deobfuscator.rar"
if not defined ARCHIVE (
  echo    [X] Deobfuscator.rar bulunamadi.
  exit /b 0
)
set "UNPACK="
set "UNPACK_TYPE="
if exist "%ProgramFiles%\WinRAR\UnRAR.exe" (
  set "UNPACK=%ProgramFiles%\WinRAR\UnRAR.exe"
  set "UNPACK_TYPE=unrar"
)
if not defined UNPACK if exist "%ProgramFiles%\7-Zip\7z.exe" (
  set "UNPACK=%ProgramFiles%\7-Zip\7z.exe"
  set "UNPACK_TYPE=7z"
)
if not defined UNPACK if exist "%ProgramFiles(x86)%\7-Zip\7z.exe" (
  set "UNPACK=%ProgramFiles(x86)%\7-Zip\7z.exe"
  set "UNPACK_TYPE=7z"
)
if not defined UNPACK (
  for /f "delims=" %%p in ('where unrar 2^>nul') do (
    if not defined UNPACK (
      set "UNPACK=%%p"
      set "UNPACK_TYPE=unrar"
    )
  )
)
if not defined UNPACK (
  echo    [X] WinRAR / 7-Zip bulunamadi; otomatik cikarma yapilamaz.
  exit /b 0
)
echo    Arsiv : %ARCHIVE%
echo    Arac  : %UNPACK%
if /i "%UNPACK_TYPE%"=="7z" (
  "%UNPACK%" x -y -o"." "%ARCHIVE%" >nul 2>nul
) else (
  "%UNPACK%" x -o+ -y "%ARCHIVE%" .\ >nul 2>nul
)
exit /b 0

:install_node
where winget >nul 2>nul
if errorlevel 1 (
  echo    Otomatik kurulum icin winget yok.
  echo    https://nodejs.org adresinden "LTS" surumunu indirin.
  exit /b 0
)
set "ANS="
set /p "ANS=   Node.js LTS simdi kurulsun mu? (E/H): "
if /i not "!ANS!"=="E" exit /b 0
winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
exit /b 0

:install_python
where winget >nul 2>nul
if errorlevel 1 (
  echo    https://python.org adresinden Python 3.12 kurun.
  exit /b 0
)
set "ANS="
set /p "ANS=   Python 3.12 simdi kurulsun mu? (E/H): "
if /i not "!ANS!"=="E" exit /b 0
winget install --id Python.Python.3.12 -e --accept-source-agreements --accept-package-agreements
exit /b 0

:install_dotnet
where winget >nul 2>nul
if errorlevel 1 (
  echo    https://dotnet.microsoft.com/download/dotnet/9.0 adresinden .NET SDK 9 kurun.
  exit /b 0
)
set "ANS="
set /p "ANS=   .NET SDK 9 simdi kurulsun mu? (E/H): "
if /i not "!ANS!"=="E" exit /b 0
winget install --id Microsoft.DotNet.SDK.9 -e --accept-source-agreements --accept-package-agreements
exit /b 0

:find_python
set "PY_OK=0"
set "PY_CMD="
where python >nul 2>nul
if not errorlevel 1 set "PY_CMD=python"
if not defined PY_CMD (
  where py >nul 2>nul
  if not errorlevel 1 set "PY_CMD=py"
)
if not defined PY_CMD (
  where python3 >nul 2>nul
  if not errorlevel 1 set "PY_CMD=python3"
)
if defined PY_CMD set "PY_OK=1"
exit /b 0

:find_dotnet_sdk
set "SDK_VER="
where dotnet >nul 2>nul
if errorlevel 1 exit /b 0
for /f "usebackq tokens=1 delims= " %%v in (`dotnet --list-sdks 2^>nul`) do (
  if not defined SDK_VER set "SDK_VER=%%v"
)
exit /b 0

:refresh_path
rem Yeni kurulan araclar mevcut pencerede gorunmez; bilinen yollari ekle
set "PATH=%PATH%;%ProgramFiles%\nodejs;%ProgramFiles%\dotnet;%LOCALAPPDATA%\Programs\Python\Python312;%LOCALAPPDATA%\Programs\Python\Python312\Scripts;%LOCALAPPDATA%\Microsoft\WindowsApps"
exit /b 0
