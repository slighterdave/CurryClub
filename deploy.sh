#!/bin/bash

# CurryClub Deployment Script for EC2 Ubuntu
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

# Ensure we use HTTPS (not SSH) so the ubuntu user doesn't need GitHub SSH keys
CURRENT_REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [[ "$CURRENT_REMOTE_URL" == git@github.com:* ]]; then
    HTTPS_URL=$(echo "$CURRENT_REMOTE_URL" | sed 's|git@github.com:|https://github.com/|')
    echo "   Switching remote URL from SSH to HTTPS..."
    git remote set-url origin "$HTTPS_URL" || { echo "❌ Failed to update remote URL. Please run: git remote set-url origin $HTTPS_URL"; exit 1; }
fi

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

# Sync `public/` directory into `dist/` for deployment
if [ -d "public" ]; then
    echo "📋 Copying public folder contents to dist..."
    cp -r public/* dist/
    echo "✅ Public folder copied!"
else
    echo "ℹ️ No public folder to copy."
fi

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

# HTTPS certificate check and renewal
echo ""
echo "🔒 HTTPS Certificate Check"
echo "================================"

DOMAIN="curryclub.lol"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
NEEDS_SETUP=false
NEEDS_RENEWAL=false

if command -v certbot &> /dev/null && [ -f "$CERT_PATH" ]; then
    EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_PATH" 2>/dev/null | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY" +%s 2>/dev/null)
    NOW_EPOCH=$(date +%s)
    if [ -z "$EXPIRY_EPOCH" ] || ! [[ "$EXPIRY_EPOCH" =~ ^[0-9]+$ ]]; then
        echo "⚠️  Could not parse certificate expiry date — skipping expiry check."
        DAYS_LEFT=999
    else
        DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
    fi

    if [ "$DAYS_LEFT" -lt 0 ]; then
        echo "❌ Certificate EXPIRED ${DAYS_LEFT#-} days ago — renewal required!"
        NEEDS_RENEWAL=true
    elif [ "$DAYS_LEFT" -lt 30 ]; then
        echo "⚠️  Certificate expires in $DAYS_LEFT days — renewal recommended."
        NEEDS_RENEWAL=true
    else
        echo "✅ Certificate is valid for $DAYS_LEFT more days (expires: $EXPIRY)."
        echo "   To force a renewal, run: ./renew-cert.sh"
    fi
else
    echo "ℹ️  No certificate found for $DOMAIN."
    NEEDS_SETUP=true
fi

if $NEEDS_RENEWAL; then
    read -p "   Renew certificate now? (Y/n): " DO_RENEW
    if [[ ! "$DO_RENEW" =~ ^[Nn]$ ]]; then
        ./renew-cert.sh
    else
        echo "   Skipped. Run ./renew-cert.sh when ready."
    fi
fi

if $NEEDS_SETUP; then
    read -p "   Set up HTTPS certificate now? (y/N): " SETUP_HTTPS
    if [[ "$SETUP_HTTPS" =~ ^[Yy]$ ]]; then
        # Install certbot if not already present
        if ! command -v certbot &> /dev/null; then
            echo "📦 Installing Certbot..."
            sudo apt update -y
            sudo apt install -y certbot python3-certbot-nginx
        fi

        echo ""
        echo "🔐 Registering HTTPS certificate for $DOMAIN and www.$DOMAIN..."
        if ! sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN"; then
            echo ""
            echo "❌ Certbot failed. Common causes:"
            echo "   - DNS for $DOMAIN is not pointing to this server"
            echo "   - Port 80 or 443 is blocked by your firewall or security group"
            echo "   Fix the issue and re-run: ./renew-cert.sh"
        else
            echo ""
            echo "✅ HTTPS certificate registered! Site available at https://$DOMAIN"
        fi
    else
        echo "   Skipping HTTPS setup. Run ./renew-cert.sh to set it up later."
    fi
fi
