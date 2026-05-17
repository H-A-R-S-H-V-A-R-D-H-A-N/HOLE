@echo off
title HOLE Installer
echo.
echo   [HOLE] Anonymous Bug Bounty Workstation Installer
echo   =================================================
echo.

REM Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERROR] Node.js is not installed.
    echo   Please install Node.js 20+ from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=1 delims=v" %%a in ('node -v') do set NODE_VER=%%a
echo   [OK] Node.js detected

REM Check for npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERROR] npm is not installed.
    pause
    exit /b 1
)

echo   [OK] npm detected
echo.

REM Auto-install Tor on Windows via PowerShell if not present
echo   [INFO] Checking Tor Engine...
where tor >nul 2>nul
if %errorlevel% neq 0 (
    echo   Tor is missing. Attempting to download Tor Expert Bundle...
    powershell -Command "Invoke-WebRequest -Uri 'https://dist.torproject.org/torbrowser/14.0.6/tor-expert-bundle-windows-x86_64-14.0.6.tar.gz' -OutFile 'tor.tar.gz'"
    echo   Please note: Windows auto-install for Tor might require manual extraction. We recommend installing Tor Browser separately.
) else (
    echo   [OK] Tor Engine detected
)

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
