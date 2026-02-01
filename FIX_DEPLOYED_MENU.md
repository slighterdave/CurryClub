# Fix "My Ratings" Menu Item on Deployed Server

## Problem

The deployed server at http://13.49.111.162 shows 4 menu items:
- Home
- **My Ratings** ❌ (should not exist)
- Top Rated
- About

The repository code is correct and only has 3 menu items (Home, Top Rated, About).

## Solution

The server needs to be updated with the latest code from the main branch. This was already fixed in PR #13, but the deployed server hasn't been updated yet.

## How to Fix

### Option 1: Automated Deployment (Recommended)

SSH into your EC2 server and run the deployment script:

```bash
ssh -i /path/to/your-key.pem ubuntu@13.49.111.162

cd /home/ubuntu/CurryClub

# Pull latest changes and redeploy
./deploy.sh
```

The `deploy.sh` script will:
- Pull the latest code from GitHub
- Install any new dependencies
- Build the application
- Restart the PM2 server

### Option 2: Manual Deployment

If the automated script doesn't work, follow these manual steps:

```bash
ssh -i /path/to/your-key.pem ubuntu@13.49.111.162

cd /home/ubuntu/CurryClub

# Pull the latest changes from main branch
git pull origin main

# Install dependencies (if any changed)
npm install

# Build the application
npm run build

# Restart the server with PM2
pm2 restart curryclub

# Check the status
pm2 status
```

### Verify the Fix

After deployment:

1. **Clear your browser cache** (important!):
   - Chrome/Edge: `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Or do a hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

2. Visit http://13.49.111.162:3001

3. Open the menu (click hamburger icon in top-right)

4. Confirm you see only 3 menu items:
   - Home
   - Top Rated
   - About

## Why This Happened

PR #13 removed the "My Ratings" menu item from the code and was merged to the main branch. However, the EC2 server continues to run the old built files until it's redeployed with the updated code.

## Related Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment guide
- [QUICK_START.md](QUICK_START.md) - Quick reference
- [deploy.sh](deploy.sh) - Automated deployment script
