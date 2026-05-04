#!/bin/bash

# CurryClub HTTPS Certificate Renewal Script
# Renews the Let's Encrypt certificate for curryclub.lol
# Usage: ./renew-cert.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMAIN="curryclub.lol"
DOMAINS="-d curryclub.lol -d www.curryclub.lol"

echo "🔒 CurryClub Certificate Renewal"
echo "=================================="
echo ""

# Check certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Certbot not found. Installing..."
    sudo apt update -y
    sudo apt install -y certbot python3-certbot-nginx
    echo "✅ Certbot installed."
    echo ""
fi

# Show current certificate status
echo "📋 Current certificate status:"
sudo certbot certificates 2>/dev/null || echo "   (No certificates found)"
echo ""

# Check expiry of the current cert
CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
if [ -f "$CERT_PATH" ]; then
    EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_PATH" 2>/dev/null | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY" +%s 2>/dev/null)
    NOW_EPOCH=$(date +%s)
    if [ -z "$EXPIRY_EPOCH" ] || ! [[ "$EXPIRY_EPOCH" =~ ^[0-9]+$ ]]; then
        echo "⚠️  Could not parse certificate expiry date. Skipping expiry check."
        DAYS_LEFT=999
    else
        DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
    fi

    if [ "$DAYS_LEFT" -lt 0 ]; then
        echo "❌ Certificate EXPIRED ${DAYS_LEFT#-} days ago (expired: $EXPIRY)"
    elif [ "$DAYS_LEFT" -lt 30 ]; then
        echo "⚠️  Certificate expires in $DAYS_LEFT days ($EXPIRY) — renewal recommended"
    else
        echo "✅ Certificate is valid for $DAYS_LEFT more days (expires: $EXPIRY)"
    fi
    echo ""
fi

# Ensure nginx has the ACME challenge location (copy updated conf if needed)
echo "🔧 Applying latest Nginx config..."
sudo cp "$SCRIPT_DIR/nginx/curryclub.conf" /etc/nginx/sites-available/curryclub
sudo nginx -t
sudo systemctl reload nginx
echo "✅ Nginx config updated and reloaded."
echo ""

# Attempt renewal
echo "🔄 Attempting certificate renewal..."
if sudo certbot renew --nginx --cert-name "$DOMAIN"; then
    echo ""
    echo "✅ Certificate renewed successfully!"
    echo ""
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded with new certificate."
else
    echo ""
    echo "❌ Automatic renewal failed. Trying forced re-issuance..."
    echo ""

    # Force re-issue (useful when the cert is fully broken/revoked)
    if sudo certbot --nginx $DOMAINS --force-renewal; then
        echo ""
        echo "✅ Certificate re-issued successfully!"
        sudo systemctl reload nginx
        echo "✅ Nginx reloaded with new certificate."
    else
        echo ""
        echo "❌ Certificate re-issuance also failed."
        echo ""
        echo "Common causes:"
        echo "  1. DNS for $DOMAIN is not pointing to this server"
        echo "  2. Port 80 is blocked (check EC2 Security Group allows port 80)"
        echo "  3. Port 443 is blocked (check EC2 Security Group allows port 443)"
        echo "  4. Nginx is not running: sudo systemctl status nginx"
        echo ""
        echo "Try manually:"
        echo "  sudo certbot --nginx $DOMAINS"
        exit 1
    fi
fi

# Ensure auto-renewal timer is active
echo ""
echo "⏰ Checking auto-renewal timer..."
if systemctl is-active --quiet certbot.timer 2>/dev/null; then
    echo "✅ certbot.timer is active (auto-renewal is set up)."
elif systemctl is-active --quiet snap.certbot.renew.timer 2>/dev/null; then
    echo "✅ snap certbot renewal timer is active (auto-renewal is set up)."
else
    echo "⚠️  Auto-renewal timer not found. Setting up cron job..."
    # Add a cron job to renew twice daily (standard certbot practice)
    CRON_JOB="0 */12 * * * root certbot renew --quiet --nginx && systemctl reload nginx"
    if ! sudo grep -qF "certbot renew" /etc/crontab 2>/dev/null; then
        echo "$CRON_JOB" | sudo tee -a /etc/crontab > /dev/null
        echo "✅ Cron job added to /etc/crontab for automatic renewal."
    else
        echo "✅ Cron job already exists in /etc/crontab."
    fi
fi

echo ""
echo "🎉 Done! Your site should now be reachable at https://$DOMAIN"
