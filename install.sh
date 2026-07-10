#!/bin/bash
# HOLE - Anonymous Bug Bounty Workstation Installer
# Usage: bash install.sh

echo ""
echo "  [HOLE] Anonymous Bug Bounty Workstation Installer"
echo "  ================================================="
echo ""

# Check for Node.js
INSTALL_NODE=false

if ! command -v node &> /dev/null; then
    echo "  [INFO] Node.js is missing. Installing automatically..."
    INSTALL_NODE=true
else
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        echo "  [INFO] Node.js is outdated (v$NODE_VERSION). Upgrading to v22 automatically..."
        INSTALL_NODE=true
    fi
fi

if [ "$INSTALL_NODE" = true ]; then
    if command -v apt-get &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v brew &> /dev/null; then
        brew install node
    else
        echo "  [WARNING] Could not automatically install Node.js. Please follow manual install instructions in README.md"
        exit 1
    fi
fi

echo "  [OK] Node.js $(node -v) detected"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "  [ERROR] npm is not installed."
    exit 1
fi

echo "  [OK] npm $(npm -v) detected"
echo ""

# Auto-install Tor
echo "  [INFO] Checking Tor Engine..."
if ! command -v tor &> /dev/null; then
    echo "  Tor is missing. Installing automatically..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y tor
    elif command -v brew &> /dev/null; then
        brew install tor
    elif command -v pacman &> /dev/null; then
        sudo pacman -Sy --noconfirm tor
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y tor
    else
        echo "  [WARNING] Could not automatically install Tor. Please install manually."
    fi
else
    echo "  [OK] Tor Engine detected"
fi

echo ""
# Install dependencies
echo "  [INFO] Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo ""
    echo "  [WARNING] npm install failed. Trying with --legacy-peer-deps..."
    npm install --legacy-peer-deps
    if [ $? -ne 0 ]; then
        echo "  [ERROR] Failed to install dependencies."
        exit 1
    fi
fi

echo ""
echo "  [SUCCESS] Installation complete!"
echo ""
echo "  To start HOLE, run:"
echo ""
echo "    npm run electron:dev"
echo ""
