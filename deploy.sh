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

echo ""
echo "✅ Build complete!"
echo ""

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo "🔄 Restarting application with PM2..."
    pm2 restart curryclub || pm2 start server.js --name curryclub
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
