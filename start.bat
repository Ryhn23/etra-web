@echo off
echo ========================================
echo    🚀 ETRA - Live2D AI Chatbot
echo ========================================
echo.

echo Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ✅ Dependencies installed successfully!
echo.

echo Starting Etra in development mode...
echo Frontend: http://localhost:5003
echo Webhook Server: http://localhost:3001
echo.

npm run dev
if %errorlevel% neq 0 (
    echo ❌ Failed to start development server
    pause
    exit /b 1
)

pause