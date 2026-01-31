#!/bin/bash

# CurryClub Deployment Script for EC2 Ubuntu
# This script automates the deployment process
# Usage: ./deploy.sh

set -e  # Exit on any error

echo "🍛 CurryClub Deployment Script"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the CurryClub directory."
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git fetch origin
git pull origin main

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

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo "🔄 Restarting application with PM2..."
    # Check if curryclub process exists in PM2
    if pm2 describe curryclub > /dev/null 2>&1; then
        echo "   Stopping existing process..."
        pm2 delete curryclub
        echo "   Starting fresh process..."
        pm2 start server.js --name curryclub
    else
        pm2 start server.js --name curryclub
    fi
    echo ""
    echo "✅ Deployment complete! Application restarted."
    echo ""
    echo "View logs with: pm2 logs curryclub"
    echo "View status with: pm2 status"
else
    echo "ℹ️  PM2 not found. To run the server:"
    echo "   npm run server"
    echo ""
    echo "💡 For production, consider installing PM2:"
    echo "   sudo npm install -g pm2"
    echo "   pm2 start server.js --name curryclub"
    echo "   pm2 save"
fi

echo ""
echo "🎉 Deployment script finished!"
echo ""
echo "⚠️  IMPORTANT: Clear your browser cache!"
echo "   Press Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)"
echo "   Or do a hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)"
