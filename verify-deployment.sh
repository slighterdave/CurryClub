#!/bin/bash

# Deployment Verification Script
# This script helps verify that the correct version is deployed and running

echo "🔍 CurryClub Deployment Verification"
echo "===================================="
echo ""

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "❌ ERROR: dist folder does not exist!"
    echo "   Run: npm run build"
    exit 1
fi

echo "✅ dist folder exists"
echo ""

# Check dist folder contents
echo "📂 dist folder contents:"
ls -lh dist/
echo ""

# Check dist/assets folder
if [ -d "dist/assets" ]; then
    echo "📂 dist/assets folder contents:"
    ls -lh dist/assets/
    echo ""
fi

# Check if index.html exists and show last modified time
if [ -f "dist/index.html" ]; then
    echo "✅ dist/index.html exists"
    echo "   Last modified: $(ls -l dist/index.html | awk '{print $6, $7, $8}')"
    echo ""
else
    echo "❌ ERROR: dist/index.html does not exist!"
    exit 1
fi

# Check if server is running
if command -v pm2 &> /dev/null; then
    echo "🔄 PM2 Status:"
    pm2 list | grep curryclub || echo "   No curryclub process found in PM2"
    echo ""
fi

# Check if port 3000 is in use
if command -v lsof &> /dev/null; then
    echo "🌐 Port 3000 status:"
    lsof -i :3000 || echo "   Port 3000 is not in use"
    echo ""
elif command -v netstat &> /dev/null; then
    echo "🌐 Port 3000 status:"
    netstat -tuln | grep :3000 || echo "   Port 3000 is not in use"
    echo ""
fi

# Try to fetch from localhost
if command -v curl &> /dev/null; then
    echo "🌐 Testing local server response:"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo "   ✅ Server responding with HTTP 200"
        
        # Check if the HTML contains the expected content
        RESPONSE=$(curl -s http://localhost:3000/)
        if echo "$RESPONSE" | grep -q "Top Ratings"; then
            echo "   ✅ Page contains 'Top Ratings' text"
        else
            echo "   ⚠️  WARNING: Page does not contain 'Top Ratings' text"
        fi
        
        # Check JavaScript bundle
        JS_FILE=$(grep -o '/assets/index-[^"]*\.js' dist/index.html | head -1)
        if [ -n "$JS_FILE" ]; then
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000${JS_FILE}" 2>/dev/null || echo "000")
            if [ "$HTTP_CODE" = "200" ]; then
                echo "   ✅ JavaScript bundle loads correctly"
            else
                echo "   ❌ ERROR: JavaScript bundle returns HTTP $HTTP_CODE"
            fi
        fi
        
        # Check CSS file
        CSS_FILE=$(grep -o '/assets/index-[^"]*\.css' dist/index.html | head -1)
        if [ -n "$CSS_FILE" ]; then
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000${CSS_FILE}" 2>/dev/null || echo "000")
            if [ "$HTTP_CODE" = "200" ]; then
                echo "   ✅ CSS file loads correctly"
            else
                echo "   ❌ ERROR: CSS file returns HTTP $HTTP_CODE"
            fi
        fi
        
        # Test /ratings route
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ratings 2>/dev/null || echo "000")
        if [ "$HTTP_CODE" = "200" ]; then
            echo "   ✅ /ratings route responds with HTTP 200"
        else
            echo "   ❌ ERROR: /ratings route returns HTTP $HTTP_CODE"
        fi
        
    elif [ "$HTTP_CODE" = "000" ]; then
        echo "   ❌ ERROR: Server is not responding (connection failed)"
    else
        echo "   ❌ ERROR: Server responding with HTTP $HTTP_CODE"
    fi
    echo ""
fi

# Show recent git commits
if command -v git &> /dev/null; then
    echo "📝 Recent Git commits:"
    git log --oneline -5 || echo "   Could not read git log"
    echo ""
    
    echo "🌿 Current Git branch:"
    git branch --show-current || echo "   Could not determine branch"
    echo ""
fi

# Final summary
echo "=================================="
echo "✅ Verification complete!"
echo ""
echo "If navigation still doesn't work, try:"
echo "1. Hard restart PM2: pm2 delete curryclub && pm2 start server.js --name curryclub"
echo "2. Clear browser cache completely (Ctrl+Shift+Delete)"
echo "3. Check browser console for errors (F12)"
echo "4. Verify you're on the correct branch"
echo "5. Run: npm run build && pm2 restart curryclub"
