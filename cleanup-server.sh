#!/bin/bash

# CurryClub Server Cleanup Script for 13.49.111.162
# This script removes outdated files and ensures a clean deployment
# Usage: ./cleanup-server.sh

set -e

echo "🧹 CurryClub Server Cleanup Script"
echo "===================================="
echo ""
echo "⚠️  This script will:"
echo "   - Stop the running application"
echo "   - Remove old build artifacts (dist/, Assets/)"
echo "   - Remove outdated documentation files"
echo "   - Remove node_modules for fresh install"
echo "   - Pull latest code from GitHub"
echo "   - Install dependencies"
echo "   - Build the application"
echo "   - Restart the application with PM2"
echo ""

# Confirm before proceeding
read -p "Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the CurryClub directory."
    exit 1
fi

# Stop PM2 if running
echo "🛑 Stopping application..."
if command -v pm2 &> /dev/null; then
    if pm2 describe curryclub > /dev/null 2>&1; then
        pm2 stop curryclub || true
        pm2 delete curryclub || true
        echo "   ✅ PM2 process stopped and deleted"
    else
        echo "   ℹ️  No PM2 process found"
    fi
else
    echo "   ℹ️  PM2 not installed"
fi

echo ""
echo "🗑️  Removing old build artifacts..."

# Remove old build directories
if [ -d "dist" ]; then
    rm -rf dist/
    echo "   ✅ Removed dist/"
else
    echo "   ℹ️  No dist/ directory found"
fi

if [ -d "Assets" ]; then
    rm -rf Assets/
    echo "   ✅ Removed Assets/"
else
    echo "   ℹ️  No Assets/ directory found"
fi

# Remove node_modules for clean install
if [ -d "node_modules" ]; then
    echo "   Removing node_modules/ (this may take a moment)..."
    rm -rf node_modules/
    echo "   ✅ Removed node_modules/"
else
    echo "   ℹ️  No node_modules/ directory found"
fi

# Remove package-lock for fresh resolution
if [ -f "package-lock.json" ]; then
    rm package-lock.json
    echo "   ✅ Removed package-lock.json"
else
    echo "   ℹ️  No package-lock.json found"
fi

echo ""
echo "📄 Removing outdated documentation..."

# Remove outdated documentation files
removed_docs=0
if [ -f "PM2_ERROR_FIX.md" ]; then
    rm PM2_ERROR_FIX.md
    echo "   ✅ Removed PM2_ERROR_FIX.md"
    removed_docs=1
fi

if [ -f "SOLUTION_SUMMARY.md" ]; then
    rm SOLUTION_SUMMARY.md
    echo "   ✅ Removed SOLUTION_SUMMARY.md"
    removed_docs=1
fi

if [ -f "TROUBLESHOOTING.md" ]; then
    rm TROUBLESHOOTING.md
    echo "   ✅ Removed TROUBLESHOOTING.md"
    removed_docs=1
fi

if [ $removed_docs -eq 0 ]; then
    echo "   ℹ️  No outdated documentation files found"
fi

echo ""
echo "📥 Pulling latest code from GitHub..."
# Set up a git wrapper that handles running as root (e.g. via sudo).
# git 2.35.2+ blocks operations in directories owned by another user, so when
# the script is invoked with sudo we run git as the original user.  When run
# directly as root we register the directory as safe instead.
if [ "$EUID" -eq 0 ] && [ -n "${SUDO_USER:-}" ]; then
    git_cmd() { sudo -u "$SUDO_USER" git "$@"; }
else
    if [ "$EUID" -eq 0 ]; then
        git config --global --add safe.directory "$PWD"
    fi
    git_cmd() { git "$@"; }
fi
git_cmd fetch origin
git_cmd checkout main || echo "   ⚠️  Warning: Could not checkout main branch"
git_cmd pull origin main

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Building application..."
npm run build

# Verify dist directory was created
if [ ! -d "dist" ]; then
    echo ""
    echo "❌ ERROR: Build failed - dist directory not created!"
    echo "   Please check the build output above for errors."
    exit 1
fi

echo ""
echo "✅ Build complete!"
echo ""

# Start with PM2 if available
if command -v pm2 &> /dev/null; then
    echo "🔄 Starting application with PM2..."
    pm2 start server.js --name curryclub
    pm2 save
    echo ""
    echo "✅ Application started!"
    echo ""
    echo "View status: pm2 status"
    echo "View logs: pm2 logs curryclub"
else
    echo "ℹ️  PM2 not found. To run the server:"
    echo "   npm run server"
    echo ""
    echo "💡 For production, consider installing PM2:"
    echo "   sudo npm install -g pm2"
fi

echo ""
echo "🎉 Cleanup and deployment complete!"
echo ""
echo "Next steps:"
echo "1. Run './verify-deployment.sh' to verify the deployment"
echo "2. Clear your browser cache (Ctrl+Shift+Delete)"
echo "3. Test the application in your browser"
echo ""
