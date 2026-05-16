@echo off
title BugVault Installer
echo.
echo   🔐 BugVault — Bug Bounty Tracker Installer
echo   ============================================
echo.

REM Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   ❌ Node.js is not installed.
    echo   Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=1 delims=v" %%a in ('node -v') do set NODE_VER=%%a
echo   ✅ Node.js detected

REM Check for npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo   ❌ npm is not installed.
    pause
    exit /b 1
)

echo   ✅ npm detected
echo.

REM Install dependencies
echo   📦 Installing dependencies...
call npm install --silent

if %errorlevel% neq 0 (
    echo   ❌ Failed to install dependencies.
    pause
    exit /b 1
)

echo.
echo   ✅ Installation complete!
echo.
echo   To start BugVault, run:
echo.
echo     npm run dev
echo.
echo   Then open http://localhost:5173 in your browser.
echo.
echo   Happy hunting! 🎯
echo.
pause
