module.exports = {
  apps: [
    {
      name: 'etra-webhook',
      script: 'webhook-server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: './logs/webhook-err.log',
      out_file: './logs/webhook-out.log',
      log_file: './logs/webhook.log',
      time: true
    },
    {
      name: 'etra-frontend',
      script: 'npm',
      args: 'run serve',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      error_file: './logs/frontend-err.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend.log',
      time: true
    }
  ],

  deploy: {
    production: {
      user: 'node',
      host: 'your-vps-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/etra-web.git',
      path: '/home/node/etra-web',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build:prod && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};