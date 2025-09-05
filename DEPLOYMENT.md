# 🚀 ETRA - VPS Deployment Guide

Panduan lengkap untuk deploy ETRA ke VPS dengan berbagai opsi deployment.

## 📋 Prerequisites

### VPS Requirements
- **OS**: Ubuntu 20.04 LTS atau 22.04 LTS
- **RAM**: Minimum 1GB (recommended 2GB+)
- **Storage**: Minimum 5GB free space
- **CPU**: 1 vCPU minimum
- **Network**: Public IP address

### Software Requirements
- **Node.js**: 18.x LTS
- **PM2**: Process manager
- **nginx**: Web server
- **Git**: Version control
- **Docker**: Optional (for containerized deployment)

---

## 🔧 Quick Setup

### 1. Initial Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git ufw

# Setup firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

### 2. Install Node.js 18
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x
```

### 3. Install PM2
```bash
sudo npm install -g pm2

# Setup PM2 startup
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### 4. Install nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

---

## 📥 Git Setup & Clone

### 1. Setup SSH Key (Recommended)
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your-email@example.com"

# Copy public key to clipboard
cat ~/.ssh/id_ed25519.pub

# Add to GitHub/GitLab:
# GitHub: Settings > SSH and GPG keys > New SSH key
# GitLab: User Settings > SSH Keys
```

### 2. Clone Repository
```bash
# Create app directory
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www

# Clone repository
cd /var/www
git clone git@github.com:your-username/etra-web.git
cd etra-web
```

### 3. Setup Git Remote
```bash
# Add upstream remote if needed
git remote add upstream https://github.com/your-username/etra-web.git

# Set default branch
git branch -M main

# Pull latest changes
git pull origin main
```

---

## ⚙️ Environment Configuration

### 1. Copy Environment Template
```bash
cp .env.example .env
```

### 2. Edit Environment Variables
```bash
nano .env
```

**Required Variables:**
```bash
# Application
NODE_ENV=production
PORT=3002

# n8n Integration
WEBHOOK_URL=https://your-n8n-webhook-url/webhook/etra-chat

# Security
SESSION_SECRET=your-super-secret-key-here
```

### 3. Generate Secure Session Secret
```bash
# Generate random secret
openssl rand -base64 32
```

---

## 🚀 Deployment Options

### Option 1: Automated Deployment Script

```bash
# Make script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

**What the script does:**
- ✅ Updates system packages
- ✅ Installs Node.js, PM2, nginx
- ✅ Clones/pulls latest code
- ✅ Installs dependencies
- ✅ Builds production assets
- ✅ Configures PM2 processes
- ✅ Sets up nginx reverse proxy
- ✅ Configures firewall

### Option 2: Manual Deployment

#### Step 1: Install Dependencies
```bash
npm install
```

#### Step 2: Build Production Assets
```bash
npm run build:prod
```

#### Step 3: Start with PM2
```bash
# Start both services
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs
```

#### Step 4: Configure nginx
```bash
# Copy nginx config
sudo cp nginx.conf /etc/nginx/nginx.conf

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Option 3: Docker Deployment

#### Using Docker Compose
```bash
# Build and start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Scale services if needed
docker-compose up -d --scale etra-web=2
```

#### Manual Docker Build
```bash
# Build image
docker build -t etra-web .

# Run container
docker run -d \
  --name etra-web \
  -p 3002:3002 \
  -p 5000:5000 \
  --env-file .env \
  etra-web
```

---

## 🔒 SSL Certificate Setup

### Using Let's Encrypt (Certbot)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Test renewal
sudo certbot renew --dry-run
```

### Manual SSL Setup
```bash
# Create SSL directory
sudo mkdir -p /etc/nginx/ssl

# Place your certificates
sudo cp your-domain.crt /etc/nginx/ssl/
sudo cp your-domain.key /etc/nginx/ssl/

# Update nginx config with SSL
```

---

## 📊 Monitoring & Maintenance

### PM2 Commands
```bash
# Check status
pm2 status

# View logs
pm2 logs
pm2 logs etra-webhook
pm2 logs etra-frontend

# Restart services
pm2 restart etra-webhook
pm2 restart all

# Monitor resources
pm2 monit
```

### nginx Commands
```bash
# Check status
sudo systemctl status nginx

# Reload configuration
sudo nginx -t && sudo systemctl reload nginx

# View logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Update Deployment
```bash
# Pull latest changes
cd /var/www/etra-web
git pull origin main

# Install new dependencies
npm install

# Rebuild assets
npm run build:prod

# Restart services
pm2 restart all
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port
sudo lsof -i :3002
sudo lsof -i :5000

# Kill process
sudo kill -9 <PID>
```

#### 2. Permission Issues
```bash
# Fix ownership
sudo chown -R $USER:$USER /var/www/etra-web

# Fix permissions
chmod +x deploy.sh
```

#### 3. nginx Configuration Error
```bash
# Test configuration
sudo nginx -t

# Check syntax
sudo nginx -c /etc/nginx/nginx.conf
```

#### 4. WebSocket Connection Issues
```bash
# Check WebSocket headers in nginx
curl -I -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     http://localhost:3002/socket.io/
```

#### 5. Memory Issues
```bash
# Check memory usage
pm2 monit

# Restart services
pm2 restart all
```

---

## 📈 Performance Optimization

### PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'etra-webhook',
    script: 'webhook-server.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    max_memory_restart: '500M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3002
    }
  }]
}
```

### nginx Optimization
```nginx
# /etc/nginx/nginx.conf
worker_processes auto;
worker_connections 1024;

# Enable gzip
gzip on;
gzip_types text/plain application/json application/javascript;

# Cache static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## 🔄 Backup & Recovery

### Automated Backup Script
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/var/www/backups"
DATE=$(date +"%Y%m%d_%H%M%S")

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application
tar -czf $BACKUP_DIR/etra_backup_$DATE.tar.gz \
    -C /var/www etra-web \
    --exclude=node_modules \
    --exclude=.git

# Backup database (if applicable)
# pg_dump etra_db > $BACKUP_DIR/db_backup_$DATE.sql

# Keep only last 7 backups
cd $BACKUP_DIR
ls -t *.tar.gz | tail -n +8 | xargs -r rm
```

### Recovery
```bash
# Stop services
pm2 stop all

# Extract backup
cd /var/www
tar -xzf /var/www/backups/etra_backup_20231201_120000.tar.gz

# Restart services
pm2 start ecosystem.config.js
```

---

## 📞 Support & Monitoring

### Health Checks
```bash
# Application health
curl http://localhost:3002/health

# nginx status
sudo systemctl status nginx

# PM2 status
pm2 status
```

### Log Monitoring
```bash
# PM2 logs
pm2 logs --lines 100

# nginx logs
sudo tail -f /var/log/nginx/error.log

# Application logs
tail -f logs/webhook-out.log
tail -f logs/frontend-out.log
```

---

## 🎯 Deployment Checklist

### Pre-Deployment
- [ ] VPS dengan Ubuntu 20.04+
- [ ] Domain name configured
- [ ] SSH access configured
- [ ] Firewall configured
- [ ] Git repository accessible

### Deployment Steps
- [ ] Clone/pull latest code
- [ ] Install dependencies
- [ ] Configure environment variables
- [ ] Build production assets
- [ ] Start PM2 processes
- [ ] Configure nginx
- [ ] Setup SSL certificate
- [ ] Test all endpoints

### Post-Deployment
- [ ] Verify frontend loads
- [ ] Test WebSocket connection
- [ ] Check webhook integration
- [ ] Monitor resource usage
- [ ] Setup automated backups

---

**🎉 Selamat! ETRA berhasil di-deploy ke VPS!**

**URLs:**
- Frontend: `https://your-domain.com`
- Health Check: `https://your-domain.com/health`
- Webhook: `https://your-domain.com/webhook/chat-response`

**Monitoring:**
- PM2: `pm2 status`
- Logs: `pm2 logs`
- nginx: `sudo systemctl status nginx`