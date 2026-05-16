#!/bin/bash
# HOLE — Anonymous Bug Bounty Workstation Installer
# Usage: bash install.sh

echo ""
echo "  🕳️  HOLE — Anonymous Bug Bounty Workstation Installer"
echo "  ======================================================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "  ❌ Node.js is not installed."
    echo "  Please install Node.js 20+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "  ❌ Node.js 20+ is required. You have $(node -v)"
    echo ""
    echo "  Install the latest LTS version:"
    echo "    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -"
    echo "    sudo apt-get install -y nodejs"
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
npm install

if [ $? -ne 0 ]; then
    echo ""
    echo "  ⚠️  npm install failed. Trying with --legacy-peer-deps..."
    npm install --legacy-peer-deps
    if [ $? -ne 0 ]; then
        echo "  ❌ Failed to install dependencies."
        exit 1
    fi
fi

echo ""
echo "  ✅ Installation complete!"
echo ""
echo "  To start HOLE, run:"
echo ""
echo "    npm run electron:dev"
echo ""
echo "  Happy hunting! 🎯"
echo ""
