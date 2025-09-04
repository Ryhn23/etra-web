@echo off
echo ========================================
echo 🚀 AI Chatbot Webhook Setup Script
echo ========================================
echo.

echo 📦 Installing dependencies...
npm install
echo ✅ Dependencies installed
echo.

echo 🌐 Starting webhook server...
start "Webhook Server" cmd /k "npm run webhook"
timeout /t 3 /nobreak > nul
echo ✅ Webhook server started on port 3002
echo.

echo 🔗 To expose to internet, run in new terminal:
echo ngrok http 3002
echo.

echo 📋 Next steps:
echo 1. Copy the ngrok HTTPS URL
echo 2. Update your n8n webhook URL
echo 3. Test the connection
echo.

echo 📖 For detailed setup instructions, see README-WEBHOOK.md
echo.

echo 🎯 Your webhook endpoints:
echo Local:  http://localhost:3002/webhook/chat-response
echo Health: http://localhost:3002/health
echo Test:   http://localhost:3002/test
echo.

pause