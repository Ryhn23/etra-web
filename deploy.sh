#!/bin/bash

# ===========================================
# ETRA - VPS Deployment Script
# ===========================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="etra-web"
APP_DIR="/var/www/etra-web"
BACKUP_DIR="/var/www/backups"
NODE_VERSION="18"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   log_error "This script should not be run as root"
   exit 1
fi

log_info "🚀 Starting ETRA deployment..."

# Update system
log_info "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    log_info "📦 Installing Node.js ${NODE_VERSION}..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    log_info "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# Install nginx if not present
if ! command -v nginx &> /dev/null; then
    log_info "📦 Installing nginx..."
    sudo apt install -y nginx
fi

# Create application directory
log_info "📁 Creating application directory..."
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# Create backup directory
sudo mkdir -p $BACKUP_DIR
sudo chown -R $USER:$USER $BACKUP_DIR

# Backup existing deployment if exists
if [ -d "$APP_DIR/.git" ]; then
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    log_info "💾 Creating backup: ${BACKUP_DIR}/backup_${TIMESTAMP}"
    cp -r $APP_DIR ${BACKUP_DIR}/backup_${TIMESTAMP}
fi

# Clone or pull repository
if [ -d "$APP_DIR/.git" ]; then
    log_info "🔄 Pulling latest changes..."
    cd $APP_DIR
    git pull origin main
else
    log_info "📥 Cloning repository..."
    git clone https://github.com/Ryhn23/etra-web.git $APP_DIR
    cd $APP_DIR
fi

# Install dependencies
log_info "📦 Installing dependencies..."
npm install

# Create environment file if not exists
if [ ! -f ".env" ]; then
    log_warning "⚠️  .env file not found. Creating from template..."
    cp .env.example .env
    log_error "❌ Please edit .env file with your configuration before continuing!"
    exit 1
fi

# Build application
log_info "🔨 Building application..."
npm run build:prod

# Create logs directory
mkdir -p logs

# Stop existing PM2 processes
log_info "🛑 Stopping existing processes..."
pm2 stop ecosystem.config.js 2>/dev/null || true
pm2 delete ecosystem.config.js 2>/dev/null || true

# Start application with PM2
log_info "🚀 Starting application..."
pm2 start ecosystem.config.js --env production
pm2 save

# Setup PM2 startup
log_info "🔄 Setting up PM2 startup..."
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
pm2 startup

# Setup nginx
log_info "🌐 Configuring nginx..."
sudo tee /etc/nginx/sites-available/etra-web > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Frontend (static files)
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Webhook server
    location /webhook/ {
        proxy_pass http://localhost:3002;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3002;
        access_log off;
    }
}
EOF

# Enable nginx site
sudo ln -sf /etc/nginx/sites-available/etra-web /etc/nginx/sites-enabled/
sudo nginx -t

if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    log_success "✅ nginx configuration updated"
else
    log_error "❌ nginx configuration error"
    exit 1
fi

# Setup firewall
log_info "🔥 Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Final status check
log_info "🔍 Checking deployment status..."
sleep 5

# Check if services are running
if pm2 list | grep -q "etra-webhook"; then
    log_success "✅ Webhook server is running"
else
    log_error "❌ Webhook server failed to start"
fi

if pm2 list | grep -q "etra-frontend"; then
    log_success "✅ Frontend is running"
else
    log_error "❌ Frontend failed to start"
fi

if sudo systemctl is-active --quiet nginx; then
    log_success "✅ nginx is running"
else
    log_error "❌ nginx failed to start"
fi

log_success "🎉 Deployment completed!"
log_info "📊 Application URLs:"
log_info "   Frontend: http://your-domain.com"
log_info "   Health Check: http://your-domain.com/health"
log_info "   PM2 Status: pm2 status"
log_info "   Logs: pm2 logs"

log_warning "⚠️  Next steps:"
log_info "   1. Update domain in nginx config"
log_info "   2. Setup SSL certificate: sudo certbot --nginx -d your-domain.com"
log_info "   3. Update .env file with production values"
log_info "   4. Test webhook integration with n8n"

echo
log_success "🚀 ETRA deployment script completed successfully!"