# Not Seeing Changes After Deployment? - Quick Fix Checklist

If you've deployed changes but don't see them on your website, work through this checklist:

## ✅ Quick Fix Steps (Do These First)

### 1. Clear Browser Cache
**This is the #1 reason you don't see changes!**

Try these in order:

- **Option A: Hard Refresh** (try this first!)
  - Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
  - Mac: `Cmd + Shift + R`

- **Option B: Open Incognito/Private Window**
  - This completely bypasses cache

- **Option C: Clear Browser Cache Completely**
  - Chrome/Edge: `Ctrl + Shift + Delete` → Select "Cached images and files" → "All time" → "Clear data"

### 2. Verify Latest Code is Deployed

SSH into your server and check:

```bash
cd /home/ubuntu/CurryClub
git log -1
```

Does the commit match what you expect? If not, deploy:

```bash
./deploy.sh
```

### 3. Restart Everything

```bash
# Restart PM2
pm2 restart curryclub

# Restart Nginx (if using)
sudo systemctl restart nginx
```

### 4. Try Again

Go back to your browser and do a hard refresh (Ctrl+Shift+R).

## 🔍 Still Not Working? Deep Troubleshooting

### Check 1: Is the Build Up to Date?

```bash
cd /home/ubuntu/CurryClub
ls -la dist/
npm run build
pm2 restart curryclub
```

### Check 2: Is PM2 Running?

```bash
pm2 status
pm2 logs curryclub --lines 50
```

If not running:
```bash
pm2 start server.js --name curryclub
```

### Check 3: Is Nginx Working? (If using Nginx)

```bash
sudo systemctl status nginx
sudo nginx -t
sudo tail -50 /var/log/nginx/curryclub_error.log
```

If there are errors:
```bash
sudo systemctl restart nginx
```

### Check 4: Check What Version is Actually Deployed

```bash
cd /home/ubuntu/CurryClub
git log -1 --oneline
cat dist/index.html | head -20
```

Compare with what you see in the browser's View Source.

## 🎯 Common Scenarios

### Scenario 1: "Changes work on :3001 but not on :80"

**Problem:** Nginx isn't configured or isn't running

**Solution:** 
```bash
sudo systemctl status nginx
```

If not active, see [NGINX_CONFIGURATION.md](NGINX_CONFIGURATION.md) to set it up.

### Scenario 2: "I deployed 10 minutes ago and still see old content"

**Problem:** Browser cache

**Solution:** 
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Disable cache"
4. Refresh the page
5. Look at the timestamps of files being loaded

### Scenario 3: "Changes appear for a moment then revert to old version"

**Problem:** Service worker or aggressive caching

**Solution:**
```bash
# On server
cd /home/ubuntu/CurryClub
npm run build
pm2 restart curryclub
sudo systemctl restart nginx

# In browser
# 1. Clear all site data:
#    - Open DevTools (F12)
#    - Application tab → Clear storage → Clear site data
# 2. Close and reopen browser
# 3. Visit site in incognito mode to verify
```

### Scenario 4: "I see 502 Bad Gateway"

**Problem:** Node.js server isn't running

**Solution:**
```bash
pm2 status
pm2 start server.js --name curryclub
```

### Scenario 5: "404 errors when I refresh the page"

**Problem:** SPA routing not properly configured

**Solution:** This should be handled by the existing `server.js`, but verify:
```bash
cd /home/ubuntu/CurryClub
pm2 logs curryclub --lines 100
```

Check if requests are reaching the server.

## 📋 Full Deployment Checklist

Use this checklist every time you deploy:

1. **On your development machine:**
   ```bash
   git push origin main
   ```

2. **On your server:**
   ```bash
   cd /home/ubuntu/CurryClub
   ./deploy.sh
   ```

3. **Verify deploy script completed successfully:**
   - Check output for any errors
   - Confirm build completed
   - Confirm PM2 restarted

4. **Restart Nginx (if using):**
   ```bash
   sudo systemctl restart nginx
   ```

5. **In your browser:**
   - Do a hard refresh: `Ctrl + Shift + R`
   - Or open incognito mode
   - Verify changes are visible

6. **If still not working:**
   - Check PM2 logs: `pm2 logs curryclub`
   - Check Nginx logs: `sudo tail -f /var/log/nginx/curryclub_error.log`
   - Verify git commit: `cd /home/ubuntu/CurryClub && git log -1`

## 📚 Detailed Guides

For more detailed information:

- **[NGINX_CONFIGURATION.md](NGINX_CONFIGURATION.md)** - Complete Nginx setup and troubleshooting
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Full deployment guide
- **[FIX_DEPLOYED_MENU.md](FIX_DEPLOYED_MENU.md)** - Specific example of deployment issue

## 🚀 Pro Tips

1. **Use DevTools to debug:**
   - Open DevTools (F12)
   - Go to Network tab
   - Check "Disable cache"
   - Reload and watch what files are being loaded

2. **Check Response Headers:**
   - In Network tab, click on a file
   - Look at Response Headers
   - Check for `Cache-Control` headers

3. **Always deploy with the script:**
   - Use `./deploy.sh` instead of manual steps
   - It ensures everything is done in the right order

4. **Keep logs open during deployment:**
   ```bash
   pm2 logs curryclub --lines 0
   ```
   Run this before deploying to see real-time output

5. **Test in incognito first:**
   - Always verify changes in an incognito window
   - This proves it's not a browser cache issue

## ⚠️ Important Notes

- **Browser cache is the #1 culprit** - Always try clearing it first
- **Hard refresh is your friend** - Get used to doing Ctrl+Shift+R
- **PM2 must be restarted** - The `./deploy.sh` script does this automatically
- **Nginx doesn't need to be restarted usually** - But it doesn't hurt
- **Always verify the git commit** - Make sure you're actually running the latest code
