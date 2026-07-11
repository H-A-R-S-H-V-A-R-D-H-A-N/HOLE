@echo off
title HOLE Installer
echo.
echo   [HOLE] Anonymous Bug Bounty Workstation Installer
echo   =================================================
echo.

REM Check for Node.js
set INSTALL_NODE=0
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   [INFO] Node.js is missing. Installing automatically via winget...
    set INSTALL_NODE=1
) else (
    echo   [OK] Node.js detected.
)

if %INSTALL_NODE%==1 (
    where winget >nul 2>nul
    if %errorlevel% neq 0 (
        echo   [WARNING] winget not found. Opening Node.js download page...
        start https://nodejs.org/
        echo   Please install Node.js LTS, then run this installer again.
        pause
        exit /b 1
    ) else (
        winget install OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
        if %errorlevel% neq 0 (
            echo   [WARNING] Failed to install Node.js automatically. Opening browser...
            start https://nodejs.org/
            echo   Please install Node.js LTS, then run this installer again.
            pause
            exit /b 1
        )
    )
)

REM Check for npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERROR] npm is not installed.
    pause
    exit /b 1
)

echo   [OK] npm detected
echo.

REM Check for Go
where go >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERROR] Go compiler is not installed. Native compilation is required.
    echo   Please install Go v1.21+ from https://go.dev/dl/ and run this installer again.
    pause
    exit /b 1
)
echo   [OK] Go compiler detected
echo.

REM Auto-install Tor on Windows via PowerShell if not present
echo   [INFO] Checking Tor Engine...
where tor >nul 2>nul
if %errorlevel% neq 0 (
    echo   Tor is missing. Attempting to download Tor Expert Bundle...
    powershell -Command "Invoke-WebRequest -Uri 'https://dist.torproject.org/torbrowser/14.0.6/tor-expert-bundle-windows-x86_64-14.0.6.tar.gz' -OutFile 'tor.tar.gz'"
    if exist tor.tar.gz (
        echo   Extracting Tor...
        tar -xf tor.tar.gz
        if not exist bin mkdir bin
        move tor bin\tor >nul 2>nul
        del tor.tar.gz
        echo   [OK] Tor installed to bin\tor
    ) else (
        echo   [WARNING] Failed to download Tor. Please install manually.
    )
) else (
    echo   [OK] Tor Engine detected
)

echo.
REM Compile Go Tools
echo   [INFO] Compiling native OS binaries for recon tools...
if not exist bin mkdir bin
for /d %%D in (core\go\*) do (
    echo   -^> Compiling %%~nxD.exe...
    go build -o "bin\%%~nxD.exe" "%%D\*.go" 2>nul
)
echo   [OK] Native binaries compiled successfully.

echo.
REM Install dependencies
echo   [INFO] Installing dependencies...
call npm install --silent

if %errorlevel% neq 0 (
    echo   [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)

echo.
echo   [SUCCESS] Installation complete!
echo.
echo   To start HOLE, run:
echo.
echo     npm run electron:dev
echo.
pause
