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

# Verify the build produced a valid index.html (not just an empty dist/ directory,
# which vite creates before building and would leave behind on a failed build)
if [ ! -f "dist/index.html" ]; then
    echo ""
    echo "❌ ERROR: Build failed - dist/index.html not found!"
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

# Update nginx config if nginx is installed and the sites-available config exists
if command -v nginx &>/dev/null && [ -f /etc/nginx/sites-available/curryclub ]; then
    echo ""
    echo "🔧 Updating Nginx configuration..."
    # Back up the live config before overwriting (preserves any certbot HTTPS additions)
    sudo cp /etc/nginx/sites-available/curryclub /etc/nginx/sites-available/curryclub.bak 2>/dev/null || true
    sudo cp nginx/curryclub.conf /etc/nginx/sites-available/curryclub
    if sudo nginx -t 2>/dev/null; then
        sudo systemctl reload nginx
        echo "✅ Nginx configuration updated and reloaded."
        # Warn if the previous config had SSL so the user knows to re-run certbot
        if grep -q "ssl_certificate" /etc/nginx/sites-available/curryclub.bak 2>/dev/null; then
            echo ""
            echo "⚠️  The previous Nginx config had SSL/HTTPS configured by certbot."
            echo "   Re-run certbot to restore HTTPS:"
            echo "   sudo certbot --nginx -d curryclub.lol -d www.curryclub.lol"
        fi
    else
        # Restore the backed-up config if the new one fails validation
        sudo cp /etc/nginx/sites-available/curryclub.bak /etc/nginx/sites-available/curryclub 2>/dev/null || true
        echo "❌ Nginx config test failed — reverted to previous config."
        echo "   Check nginx/curryclub.conf for errors."
    fi
fi

echo ""
echo "🎉 Deployment script finished!"
echo ""
echo "⚠️  IMPORTANT: Clear your browser cache!"
echo "   Press Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)"
echo "   Or do a hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)"

# HTTPS registration with Let's Encrypt / Certbot
echo ""
echo "🔒 HTTPS Setup (Let's Encrypt)"
echo "================================"
read -p "Would you like to register/renew an HTTPS certificate? (y/N): " SETUP_HTTPS

if [[ "$SETUP_HTTPS" =~ ^[Yy]$ ]]; then
    read -p "Enter your domain name (e.g. curryclub.example.com): " DOMAIN_NAME

    if [ -z "$DOMAIN_NAME" ]; then
        echo "❌ No domain name provided. Skipping HTTPS setup."
        echo "   Re-run deploy.sh and enter a domain name to set up HTTPS."
    else
        # Install certbot if not already present
        if ! command -v certbot &> /dev/null; then
            echo "📦 Installing Certbot..."
            sudo apt update -y
            sudo apt install -y certbot python3-certbot-nginx
        fi

        echo ""
        echo "🔐 Registering HTTPS certificate for $DOMAIN_NAME..."
        if ! sudo certbot --nginx -d "$DOMAIN_NAME"; then
            echo ""
            echo "❌ Certbot failed to register a certificate for $DOMAIN_NAME."
            echo "   Common causes:"
            echo "   - DNS for $DOMAIN_NAME is not pointing to this server"
            echo "   - Port 80 or 443 is blocked by your firewall or security group"
            echo "   - The domain name is invalid or unreachable"
            echo "   Fix the issue above and re-run: sudo certbot --nginx -d $DOMAIN_NAME"
        else
            echo ""
            echo "🔄 Testing certificate auto-renewal..."
            if ! sudo certbot renew --dry-run; then
                echo ""
                echo "⚠️  Auto-renewal test failed. Your certificate is still valid."
                echo "   This is only a test; your live certificate was not affected."
                echo "   Check certbot logs for details: sudo journalctl -u certbot"
            fi

            echo ""
            echo "✅ HTTPS certificate registered for $DOMAIN_NAME!"
            echo "   Your site is now available at https://$DOMAIN_NAME"
            echo "   Certbot will automatically renew the certificate before it expires."
        fi
    fi
else
    echo "ℹ️  Skipping HTTPS setup."
    echo "   To set up HTTPS later, run: sudo certbot --nginx -d your-domain.com"
fi
