#!/bin/bash
# BugVault Installer for Linux / macOS / Kali
# Usage: bash install.sh

echo ""
echo "  🔐 BugVault — Bug Bounty Tracker Installer"
echo "  ============================================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "  ❌ Node.js is not installed."
    echo "  Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "  ❌ Node.js 18+ is required. You have v$(node -v)"
    exit 1
fi

echo "  ✅ Node.js $(node -v) detected"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "  ❌ npm is not installed."
    exit 1
fi

echo "  ✅ npm $(npm -v) detected"
echo ""

# Install dependencies
echo "  📦 Installing dependencies..."
npm install --silent

if [ $? -ne 0 ]; then
    echo "  ❌ Failed to install dependencies."
    exit 1
fi

echo ""
echo "  ✅ Installation complete!"
echo ""
echo "  To start BugVault, run:"
echo ""
echo "    npm run dev"
echo ""
echo "  Then open http://localhost:5173 in your browser."
echo ""
echo "  Happy hunting! 🎯"
echo ""
