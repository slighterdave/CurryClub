# Troubleshooting Navigation Issues on EC2

## Problem
The "Top Ratings" menu link doesn't navigate to the ratings page, even after building and restarting PM2.

## Root Cause
**Browser caching** was preventing navigation updates from being applied. The server wasn't sending proper cache headers, causing browsers to cache the old version of the application.

## Solution Applied

### 1. Updated Server Cache Headers
The `server.js` now sends proper cache control headers:
- **index.html**: Never cached (ensures routing updates work immediately)
- **Assets with hashes**: Cached for 1 year (safe since hash changes with content)

### 2. Improved Deployment Script
The `deploy.sh` now does a **full restart** instead of just `pm2 restart`:
```bash
pm2 delete curryclub    # Completely remove old process
pm2 start server.js     # Start fresh process
```

## Deployment Steps

### Option 1: Using Deployment Script (Recommended)
```bash
cd /home/ubuntu/CurryClub
./deploy.sh
```

### Option 2: Manual Deployment
```bash
cd /home/ubuntu/CurryClub
git pull origin main
npm install
npm run build
pm2 delete curryclub
pm2 start server.js --name curryclub
pm2 save
```

## CRITICAL: Clear Browser Cache!

After deploying, you **MUST** clear your browser cache. Choose one method:

### Method 1: Hard Refresh (Quick)
- **Windows/Linux**: Press `Ctrl + Shift + R`
- **Mac**: Press `Cmd + Shift + R`

### Method 2: Clear Cache Completely (Thorough)
1. Press `Ctrl + Shift + Delete` (Windows/Linux) or `Cmd + Shift + Delete` (Mac)
2. Select "Cached images and files"
3. Choose "All time" for the time range
4. Click "Clear data"

### Method 3: Incognito/Private Window (Testing)
Open an incognito/private browsing window to test without cached data.

## Verification Steps

After deployment and clearing cache:

1. **Open the application** in your browser
2. **Click the burger menu** (three lines in top right)
3. **Click "Top Ratings"**
4. **Expected result**: 
   - Page navigates to ratings page
   - URL changes to `http://your-ip:3000/ratings`
   - Page shows "No ratings yet" or list of rated restaurants

## Using the Verification Script

Run the verification script to check your deployment:

```bash
cd /home/ubuntu/CurryClub
chmod +x verify-deployment.sh
./verify-deployment.sh
```

This will check:
- ✅ dist folder exists with recent files
- ✅ Server is running on port 3000
- ✅ Server returns HTTP 200 for index.html
- ✅ JavaScript and CSS files load correctly
- ✅ /ratings route responds properly

## Common Issues

### Issue 1: Navigation still doesn't work after deployment
**Solution**: 
- Clear browser cache completely (see methods above)
- Try in incognito/private window
- Check browser console for errors (F12 → Console tab)

### Issue 2: Server not responding
**Solution**:
```bash
pm2 status                    # Check if curryclub is running
pm2 logs curryclub           # Check for errors
pm2 restart curryclub        # Try restarting
```

### Issue 3: Port 3000 already in use
**Solution**:
```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill the specific process (replace PID with actual process ID)
kill -9 PID

# Or restart the server
pm2 delete curryclub
pm2 start server.js --name curryclub
```

### Issue 4: Files not updating after build
**Solution**:
```bash
# Verify build files exist and are recent
ls -lh dist/
ls -lh dist/assets/

# If files are old, try cleaning and rebuilding
rm -rf dist/
npm run build

# Then restart
pm2 delete curryclub
pm2 start server.js --name curryclub
```

### Issue 5: PM2 not installed
**Solution**:
```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the server
pm2 start server.js --name curryclub
pm2 save

# Set PM2 to start on boot
pm2 startup systemd
# Follow the instructions output by the command above
```

## Technical Details

### Cache Headers Sent
**For index.html:**
```
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

**For assets (CSS/JS with hashes):**
```
Cache-Control: public, max-age=31536000, immutable
```

### Why This Matters
- **index.html** contains the routing configuration
- If browsers cache it, they won't pick up navigation changes
- Assets can be cached aggressively because their filename changes with content
- This ensures fast loading while preventing stale routing issues

## Still Having Issues?

1. **Check PM2 logs:**
   ```bash
   pm2 logs curryclub --lines 50
   ```

2. **Check if the correct files are being served:**
   ```bash
   curl -I http://localhost:3000/
   # Should show Cache-Control: no-cache, no-store, must-revalidate
   ```

3. **Test the /ratings route directly:**
   ```bash
   curl http://localhost:3000/ratings
   # Should return HTML (not 404)
   ```

4. **Check browser console** (F12 → Console) for JavaScript errors

5. **Check browser network tab** (F12 → Network) to see what files are loading

## Success Indicators

You'll know it's working when:
- ✅ Clicking "Top Ratings" changes the URL to `/ratings`
- ✅ The ratings page loads (showing "No ratings yet" or restaurant list)
- ✅ The menu closes after clicking
- ✅ No errors in browser console
- ✅ All network requests return HTTP 200
