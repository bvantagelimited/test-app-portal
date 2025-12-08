#!/bin/bash

# ===========================================
# App Distribution - Deployment Script
# For Ubuntu Server with Nginx + PM2
# ===========================================

set -e

# Configuration
APP_NAME="app-distribution"
APP_DIR="/var/www/app-distribution"
REPO_URL="https://github.com/your-org/test-app-portal.git"  # Update this
BRANCH="main"
DOMAIN="apps.ipification.com"
NODE_VERSION="22"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "Please run as root (sudo ./deploy.sh)"
fi

log "Starting deployment for ${APP_NAME}..."

# ===========================================
# 1. System Updates & Dependencies
# ===========================================
log "Updating system packages..."
apt update && apt upgrade -y

log "Installing required packages..."
apt install -y curl git nginx certbot python3-certbot-nginx

# ===========================================
# 2. Install Node.js
# ===========================================
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt $NODE_VERSION ]]; then
    log "Installing Node.js ${NODE_VERSION}..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
else
    log "Node.js $(node -v) already installed"
fi

# ===========================================
# 3. Install PM2
# ===========================================
if ! command -v pm2 &> /dev/null; then
    log "Installing PM2..."
    npm install -g pm2
else
    log "PM2 already installed"
fi

# ===========================================
# 4. Setup Application Directory
# ===========================================
log "Setting up application directory..."
mkdir -p $APP_DIR

if [ -d "$APP_DIR/.git" ]; then
    log "Pulling latest changes..."
    cd $APP_DIR
    git fetch origin
    git reset --hard origin/$BRANCH
else
    log "Cloning repository..."
    git clone -b $BRANCH $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# ===========================================
# 5. Install Dependencies & Build
# ===========================================
log "Installing npm dependencies..."
npm ci --production=false

log "Building application..."
npm run build

# Create uploads directory
mkdir -p $APP_DIR/uploads
chown -R www-data:www-data $APP_DIR/uploads

# ===========================================
# 6. Setup PM2 Process
# ===========================================
log "Setting up PM2 process..."

# Stop existing process if running
pm2 stop $APP_NAME 2>/dev/null || true
pm2 delete $APP_NAME 2>/dev/null || true

# Start new process
pm2 start npm --name $APP_NAME -- start
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root
systemctl enable pm2-root

# ===========================================
# 7. Setup Nginx
# ===========================================
log "Configuring Nginx..."

# Copy nginx config
cp $APP_DIR/nginx/apps.ipification.com.conf /etc/nginx/sites-available/

# Create symlink if not exists
if [ ! -L "/etc/nginx/sites-enabled/apps.ipification.com.conf" ]; then
    ln -s /etc/nginx/sites-available/apps.ipification.com.conf /etc/nginx/sites-enabled/
fi

# Remove default site if exists
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t || error "Nginx configuration test failed"

# ===========================================
# 8. SSL Certificate
# ===========================================
log "Setting up SSL certificate..."

# Check if certificate already exists
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    warn "SSL certificate not found. Obtaining new certificate..."
    
    # Temporarily modify nginx config for HTTP-only (for certbot)
    cat > /etc/nginx/sites-available/apps.ipification.com.conf << 'TEMPCONF'
server {
    listen 80;
    server_name apps.ipification.com;
    
    location / {
        proxy_pass http://127.0.0.1:3009;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
TEMPCONF
    
    systemctl reload nginx
    
    # Get certificate
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@ipification.com --redirect
    
    # Restore full config
    cp $APP_DIR/nginx/apps.ipification.com.conf /etc/nginx/sites-available/
else
    log "SSL certificate already exists"
fi

# Reload nginx with full config
systemctl reload nginx

# ===========================================
# 9. Setup Firewall
# ===========================================
log "Configuring firewall..."
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw --force enable

# ===========================================
# 10. Final Checks
# ===========================================
log "Running final checks..."

# Check if app is running
sleep 3
if pm2 list | grep -q $APP_NAME; then
    log "✓ PM2 process is running"
else
    error "PM2 process failed to start"
fi

# Check if nginx is running
if systemctl is-active --quiet nginx; then
    log "✓ Nginx is running"
else
    error "Nginx is not running"
fi

# Health check
sleep 2
if curl -s http://localhost:3009 > /dev/null; then
    log "✓ Application is responding"
else
    warn "Application may not be responding yet. Check logs with: pm2 logs $APP_NAME"
fi

# ===========================================
# Done!
# ===========================================
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "  URL: https://$DOMAIN"
echo "  Admin: https://$DOMAIN?admin=true"
echo ""
echo "  Useful commands:"
echo "    pm2 logs $APP_NAME     - View logs"
echo "    pm2 restart $APP_NAME  - Restart app"
echo "    pm2 status             - Check status"
echo ""
