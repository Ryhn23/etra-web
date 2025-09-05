#!/bin/bash

echo "========================================"
echo "    🚀 ETRA - Live2D AI Chatbot"
echo "========================================"
echo

echo "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo
echo "✅ Dependencies installed successfully!"
echo

echo "Starting Etra in development mode..."
echo "Frontend: http://localhost:5003"
echo "Webhook Server: http://localhost:3001"
echo

npm run dev

if [ $? -ne 0 ]; then
    echo "❌ Failed to start development server"
    exit 1
fi