@echo off
chcp 65001 >nul 2>nul
setlocal enableextensions
title Lua Deobfuscator - Kurulum
cd /d "%~dp0"

echo ==========================================================
echo   Lua Deobfuscator - kurulum / bagimlilik kontrolu
echo ==========================================================
echo.

echo [0/5] Arac klasorleri kontrolu ...
if exist "ClydeDeobfuscator-main" goto :toolspresent
if exist "tools\deob.js" if exist "hercules-deobfuscator-main" goto :toolspresent

echo    Arac klasorleri yok; arsiv araniyor ...
set "ARCHIVE="
if exist "%~dp0Deobfuscator.rar"    set "ARCHIVE=%~dp0Deobfuscator.rar"
if not defined ARCHIVE if exist "%~dp0..\Deobfuscator.rar" set "ARCHIVE=%~dp0..\Deobfuscator.rar"

if not defined ARCHIVE (
  echo    [!] Deobfuscator.rar bulunamadi.
  echo        Arsivi bu klasore^(.^) cikarip Kurulum.bat'i tekrar calistirin.
  goto :toolspresent
)

echo    Arsiv: %ARCHIVE%
set "UNPACK="
if exist "%ProgramFiles%\WinRAR\UnRAR.exe"     set "UNPACK=%ProgramFiles%\WinRAR\UnRAR.exe"
if not defined UNPACK if exist "%ProgramFiles%\7-Zip\7z.exe"        set "UNPACK=%ProgramFiles%\7-Zip\7z.exe"
if not defined UNPACK if exist "%ProgramFiles(x86)%\7-Zip\7z.exe"   set "UNPACK=%ProgramFiles(x86)%\7-Zip\7z.exe"
if not defined UNPACK if exist "%ProgramFiles%\WinRAR\WinRAR.exe"   set "UNPACK=%ProgramFiles%\WinRAR\WinRAR.exe"

if not defined UNPACK (
  echo    [!] WinRAR / 7-Zip bulunamadi.
  echo        Arsivi sag tik -^> "Buraya cikar" ile bu klasore cikarin.
  goto :toolspresent
)

echo    Cikariliyor ... ^(buyuk arsiv, biraz surebilir^)
"%UNPACK%" x -o+ -y "%ARCHIVE%" "%~dp0." >nul 2>nul
if not errorlevel 1 goto :toolsdone
"%UNPACK%" x -y -o"%~dp0." "%ARCHIVE%" >nul 2>nul

:toolsdone
if exist "ClydeDeobfuscator-main" (
  echo    OK   - arac klasorleri cikarildi.
) else (
  echo    [!] Cikarma basarisiz. Arsivi elle cikarin ^(WinRAR / 7-Zip^).
)
goto :aftertools

:toolspresent
echo    OK   - arac klasorleri mevcut.

:aftertools
echo.

echo [1/5] Node.js kontrolu ...
where node >nul 2>nul
if errorlevel 1 (
  echo    YOK  -^> https://nodejs.org  ^(Node.js 18+^)
) else (
  for /f "delims=" %%v in ('node -v') do echo    OK   - Node %%v
)
echo.

echo [2/5] Python kontrolu ...
set "PYFOUND="
where python >nul 2>nul
if not errorlevel 1 set "PYFOUND=python"
if not defined PYFOUND (
  where py >nul 2>nul
  if not errorlevel 1 set "PYFOUND=py"
)
if not defined PYFOUND (
  where python3 >nul 2>nul
  if not errorlevel 1 set "PYFOUND=python3"
)
if defined PYFOUND (
  echo    OK   - %PYFOUND%
) else (
  echo    YOK  -^> https://python.org  ^(Python 3.10+^)
)
echo.

echo [3/5] .NET kontrolu ...
where dotnet >nul 2>nul
if errorlevel 1 (
  echo    YOK  -^> https://dotnet.microsoft.com/download
  echo           Gerekli: .NET 9 SDK ^(Moonsec^) ve .NET 8 runtime ^(77fuscator^)
  goto :skipbuild
) else (
  for /f "delims=" %%v in ('dotnet --version') do echo    OK   - .NET SDK %%v
)
echo.

echo [4/5] C# araclari derleniyor ...
if exist "MoonsecDeobfuscator-master\MoonsecDeobfuscator.sln" (
  echo    - MoonsecDeobfuscator ^(net9.0^) ...
  dotnet build "MoonsecDeobfuscator-master\MoonsecDeobfuscator.sln" -c Release --nologo -v quiet
  if errorlevel 1 echo      [!] Derleme basarisiz. .NET 9 SDK kurulu mu?
) else (
  echo    - MoonsecDeobfuscator kaynagi bulunamadi, atlandi.
)

if not exist "77fuscatorDeobfuscator-main\77fuscatorDeobfuscator-main\bin\Debug\net8.0\deobfuscator.exe" (
  if exist "77fuscatorDeobfuscator-main\77fuscatorDeobfuscator-main\deobfuscator.csproj" (
    echo    - 77fuscator ^(net8.0^) ...
    dotnet build "77fuscatorDeobfuscator-main\77fuscatorDeobfuscator-main\deobfuscator.csproj" -c Debug --nologo -v quiet
    if errorlevel 1 echo      [!] Derleme basarisiz. .NET 8 SDK/runtime kurulu mu?
  )
) else (
  echo    - 77fuscator hazir ^(paketteki exe^).
)
:skipbuild
echo.

echo [5/5] Opsiyonel npm paketi ^(promdeobf / luau-web^) ...
where npm >nul 2>nul
if errorlevel 1 (
  echo    npm yok, atlandi.
) else (
  if exist "promdeobf\promdeobf\main.js" (
    pushd "promdeobf\promdeobf"
    call npm install luau-web --no-audit --no-fund --silent
    popd
    echo    promdeobf icin luau-web denendi.
  ) else (
    echo    promdeobf bulunamadi, atlandi.
  )
)
echo.

echo ==================== DURUM ====================
node "%~dp0tools\deob.js" --doctor
echo.
echo Kurulum tamam. Deobfuscate.bat uzerine .lua dosyasi surukleyin.
echo.
pause
endlocal
