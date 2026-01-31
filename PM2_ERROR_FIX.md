# PM2 Error State Quick Fix Guide

## Problem
Your PM2 shows curryclub in "errored" state:
```bash
pm2 list
# Shows: status: errored, pid: 0, uptime: 0, ↺: 15
```

## Cause
The application is crashing on startup, most commonly because:
1. Dependencies are not installed (no node_modules)
2. Application is not built (no dist folder)

## Quick Fix (Recommended)

On your EC2 server, run:

```bash
cd /home/ubuntu/CurryClub
./deploy.sh
```

This script will automatically:
- Pull latest code
- Install dependencies (npm install)
- Build the application (npm run build)
- Restart PM2 cleanly

## Manual Fix

If you prefer to do it step by step:

```bash
cd /home/ubuntu/CurryClub

# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install

# 3. Build the application
npm run build

# 4. Restart PM2 cleanly
pm2 delete curryclub
pm2 start server.js --name curryclub
pm2 save

# 5. Verify it's working
pm2 status
```

## Verify the Fix

After running the fix:

```bash
# Check PM2 status - should show "online"
pm2 status

# Check the logs - should show "Server running on..."
pm2 logs curryclub --lines 20

# Test the health endpoint
curl http://localhost:3000/_health
# Should return: {"status":"ok"}
```

## Expected PM2 Status After Fix

```bash
pm2 list
┌────┬──────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name         │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├────┼──────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0  │ curryclub    │ default     │ 1.0.0   │ fork    │ 12345    │ 5s     │ 0    │ online    │ 0%       │ 50.0mb   │ ubuntu   │ disabled │
└────┴──────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```

Key indicators of success:
- ✅ status: **online** (not errored)
- ✅ pid: actual number (not 0)
- ✅ uptime: increasing (not 0)
- ✅ ↺ (restarts): 0 or low number (not 15+)

## Common Errors and Fixes

### Error: "Cannot find package 'express'"
```bash
cd /home/ubuntu/CurryClub
npm install
pm2 restart curryclub
```

### Error: "dist directory not found"
```bash
cd /home/ubuntu/CurryClub
npm run build
pm2 restart curryclub
```

### Error: "EADDRINUSE" (Port already in use)
```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill the process (replace PID with actual number)
kill -9 PID

# Restart PM2
pm2 restart curryclub
```

## Debugging Tips

If the issue persists:

```bash
# 1. Check PM2 logs for specific error
pm2 logs curryclub --lines 50

# 2. Try running the server directly to see the error
cd /home/ubuntu/CurryClub
node server.js
# If it crashes, you'll see the exact error message

# 3. Verify the build exists
ls -la dist/
# Should show index.html and assets/ folder

# 4. Verify dependencies are installed
ls -la node_modules/
# Should show many packages including express, react, etc.
```

## Prevention

To prevent this issue in the future:
1. Always run `./deploy.sh` when deploying updates
2. Never manually delete node_modules or dist without rebuilding
3. Keep PM2 logs monitoring active: `pm2 logs curryclub`

## Need More Help?

See the comprehensive troubleshooting guide:
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Detailed troubleshooting steps
- [SOLUTION_SUMMARY.md](./SOLUTION_SUMMARY.md) - Technical explanations
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
