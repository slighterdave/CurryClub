# Deployment Guide for EC2 Ubuntu Instance

This guide provides step-by-step instructions for deploying the CurryClub application to an AWS EC2 instance running Ubuntu.

## Prerequisites

Before starting, ensure you have:
- An EC2 Ubuntu instance (20.04 LTS or newer recommended)
- SSH access to your EC2 instance
- Security group configured to allow inbound traffic on port 3000 (or your chosen port)

## Step 1: Connect to Your EC2 Instance

```bash
ssh -i /path/to/your-key.pem ubuntu@your-ec2-public-ip
```

## Step 2: Install Node.js and npm

The application requires Node.js 18 or newer. This guide uses Node.js 20.x LTS, which is recommended for production.

```bash
# Update package list
sudo apt update

# Install Node.js 20.x (LTS) from NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x or higher
```

## Step 3: Install Git (if not already installed)

```bash
sudo apt install -y git

# Verify installation
git --version
```

## Step 4: Install Build Dependencies

The `better-sqlite3` package requires build tools:

```bash
sudo apt install -y build-essential python3
```

## Step 5: Clone the Repository

### First Time Setup

If this is your first deployment:

```bash
# Navigate to your preferred directory
cd /home/ubuntu

# Clone the repository
git clone https://github.com/slighterdave/CurryClub.git

# Navigate into the project directory
cd CurryClub
```

### Updating to Latest Version

If you already have the repository cloned and want to update to the latest version:

```bash
# Navigate to the project directory
cd /home/ubuntu/CurryClub

# Stop the running server first (if using PM2, see below)
# If running manually, press Ctrl+C in the terminal where server is running

# Fetch the latest changes
git fetch origin

# Pull the latest changes from the main branch
git pull origin main

# If you're on a different branch, replace 'main' with your branch name
```

## Step 6: Install Dependencies

```bash
# Make sure you're in the CurryClub directory
cd /home/ubuntu/CurryClub

# Install all npm dependencies
npm install
```

This will install both production and development dependencies needed for building.

## Step 7: Build the Application

```bash
# Build the production version
npm run build
```

This command:
- Compiles TypeScript to JavaScript
- Bundles the React application with Vite
- Creates optimized production files in the `dist/` directory

## Step 8: Configure Environment (Optional)

Create a `.env` file if you need custom configuration:

```bash
nano .env
```

Add any environment variables you need:

```
PORT=3000
DB_PATH=/home/ubuntu/CurryClub/ratings.db
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

## Step 9: Run the Production Server

### Option A: Run Manually (Testing)

For testing purposes, you can run the server manually:

```bash
npm run server
```

The application will be available at `http://your-ec2-public-ip:3000`

To stop the server, press `Ctrl+C`.

**Note:** This method stops the server when you close the SSH session.

### Option B: Run with PM2 (Recommended for Production)

PM2 is a production process manager that keeps your application running, restarts it if it crashes, and manages logs.

#### Install PM2 Globally

```bash
sudo npm install -g pm2
```

#### Start the Application with PM2

```bash
# Start the server with PM2
pm2 start server.js --name curryclub

# Save the PM2 process list (so it survives reboots)
pm2 save

# Configure PM2 to start on system boot
pm2 startup systemd
# Follow the instructions output by the command above
```

#### Common PM2 Commands

```bash
# View running applications
pm2 list

# View logs
pm2 logs curryclub

# Restart the application
pm2 restart curryclub

# Stop the application
pm2 stop curryclub

# Delete the application from PM2
pm2 delete curryclub

# Monitor CPU and memory usage
pm2 monit
```

## Step 10: Update Your Application (Future Updates)

### Option A: Automated Update Script (Recommended)

The repository includes a deployment script that automates the update process:

```bash
# Navigate to project directory
cd /home/ubuntu/CurryClub

# Make the script executable (first time only)
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

The script will:
- Pull the latest changes from GitHub
- Install any new dependencies
- Build the application
- Restart the server (if using PM2)

### Option B: Manual Update

If you prefer to update manually:

```bash
# Navigate to project directory
cd /home/ubuntu/CurryClub

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Rebuild the application
npm run build

# Restart the server
pm2 restart curryclub  # If using PM2
# OR press Ctrl+C and run 'npm run server' again if running manually
```

## Security Recommendations

### 1. Use a Reverse Proxy (Nginx)

For production, it's recommended to use Nginx as a reverse proxy:

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/curryclub
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Or your EC2 public IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable the site:

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/curryclub /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

Now your app will be available on port 80 (HTTP).

### 2. Set Up HTTPS with Let's Encrypt (Optional)

If you have a domain name:

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com
```

### 3. Configure Firewall

```bash
# Allow SSH
sudo ufw allow ssh

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS (if using SSL)
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

## Troubleshooting

### Port Already in Use

If you get an error that port 3000 is already in use:

```bash
# Find the process using port 3000
sudo lsof -i :3000

# Kill the process (replace PID with the actual process ID)
kill -9 PID
```

### Permission Issues with SQLite Database

If you encounter database permission errors:

```bash
# Make sure the database file is writable
chmod 644 /home/ubuntu/CurryClub/ratings.db

# Make sure the directory is writable (SQLite needs this)
chmod 755 /home/ubuntu/CurryClub
```

### Build Failures

If `npm run build` fails:

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install

# Try building again
npm run build
```

### PM2 Logs

If the application isn't working as expected:

```bash
# View real-time logs
pm2 logs curryclub

# View error logs only
pm2 logs curryclub --err

# Clear logs
pm2 flush
```

## Backup Your Database

The application stores all ratings in a SQLite database (`ratings.db`). To back it up:

```bash
# Create a backup
cp /home/ubuntu/CurryClub/ratings.db /home/ubuntu/CurryClub/ratings.db.backup

# Or with timestamp
cp /home/ubuntu/CurryClub/ratings.db /home/ubuntu/CurryClub/ratings.db.$(date +%Y%m%d_%H%M%S)
```

To automate backups with a cron job:

```bash
# Edit crontab
crontab -e

# Add this line to backup daily at 2 AM (keeps one backup per day)
0 2 * * * cp /home/ubuntu/CurryClub/ratings.db /home/ubuntu/CurryClub/ratings.db.$(date +\%Y\%m\%d)

# Or to keep backups with full timestamp (allows multiple backups per day)
0 2 * * * cp /home/ubuntu/CurryClub/ratings.db /home/ubuntu/CurryClub/ratings.db.$(date +\%Y\%m\%d_\%H\%M\%S)
```

**Note:** The first cron example creates one backup per day (overwrites if run multiple times). The second keeps all backups with unique timestamps.

## Quick Reference Commands

### Automated Deployment (Recommended)

```bash
# Navigate to project
cd /home/ubuntu/CurryClub

# Run deployment script
./deploy.sh
```

### Manual Commands

```bash
# Navigate to project
cd /home/ubuntu/CurryClub

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build application
npm run build

# Start with PM2
pm2 start server.js --name curryclub

# Restart with PM2
pm2 restart curryclub

# View logs
pm2 logs curryclub

# View status
pm2 status
```

## Support

For issues or questions:
- Check the main [README.md](README.md) for development setup
- Review application logs: `pm2 logs curryclub`
- Check system logs: `sudo journalctl -u nginx` (if using Nginx)
