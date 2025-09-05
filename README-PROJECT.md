# 🚀 Etra - Live2D AI Chatbot Project

**Enhanced Textual Responsive Assistant** dengan Live2D character, real-time chat, file upload, dan audio recording.

## 📋 Prerequisites

### System Requirements
- **Node.js** 16+ (recommended: 18+)
- **npm** 8+
- **Git** (untuk clone repository)
- **Modern web browser** dengan WebGL support
- **Microphone access** (untuk audio recording)

### Dependencies
- **Live2D Cubism SDK** (sudah included)
- **Express.js** (untuk webhook server)
- **WebSocket** (untuk real-time communication)
- **Multer** (untuk file handling)

## 🛠️ Quick Setup & Run

### 1. Install Dependencies
```bash
cd etra_web
npm install
```

### 2. Jalankan Project (Development Mode)
```bash
# Jalankan frontend + webhook server sekaligus
npm run dev
```

**Atau jalankan terpisah:**

**Terminal 1 - Frontend:**
```bash
npm start
# Akan berjalan di: http://localhost:5000
```

**Terminal 2 - Webhook Server:**
```bash
npm run webhook
# Akan berjalan di: http://localhost:3002
```

### 3. Akses Aplikasi
- **Frontend:** http://localhost:5000
- **Webhook Server:** http://localhost:3002
- **Health Check:** http://localhost:3002/health

## 🎯 Features Overview

### ✅ Core Features
- **Live2D Character** (Haru & jingliu models) - 40% left panel, cropped to show upper body only
- **Real-time Chat** dengan AI via n8n
- **File Upload** (images, audio, documents)
- **Audio Recording** (OGG format)
- **Mixed Content** (text + files)
- **Responsive Design** (mobile-friendly)
- **Dark Mode UI**

### ✅ Advanced Features
- **Base64 File Encoding** (n8n compatible)
- **WebSocket Communication**
- **File Size Validation** (max 10MB)
- **Multiple File Support**
- **Attachment Preview**
- **Typing Indicators**
- **Message Timestamps**

## 🔧 Configuration

### Webhook URLs
```javascript
// src/main.ts
const CONFIG = {
  WEBHOOK_URL: 'https://n8n.nextray.online/webhook-test/e1d52c48-5940-4120-b059-68c2b202aeef',
  // Ganti dengan URL n8n webhook Anda
};
```

### File Settings
```javascript
const CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  SUPPORTED_AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  SUPPORTED_FILE_TYPES: ['application/pdf', 'text/plain', 'application/msword']
};
```

## 🌐 n8n Integration Setup

### 1. Create n8n Workflow

#### Node 1: Webhook (Receive)
- **HTTP Method:** POST
- **Path:** `/webhook-test/e1d52c48-5940-4120-b059-68c2b202aeef`
- **Response Mode:** Last Node

#### Node 2: Function (Process Message)
```javascript
// Process incoming message
const data = $node["Webhook"].json;

// Handle text messages
if (data.messageType === 'text') {
  // Process text message
  return {
    response: `AI Response to: "${data.content}"`,
    userId: data.userId,
    messageId: `resp_${Date.now()}`
  };
}

// Handle mixed content (text + files)
if (data.messageType === 'mixed') {
  const files = data.files || [];

  // Process files
  files.forEach((file, index) => {
    console.log(`File ${index + 1}:`, file.name, file.type, file.size);
    // file.data contains base64 encoded content
  });

  return {
    response: `Received ${files.length} file(s) with message: "${data.content}"`,
    userId: data.userId,
    messageId: `resp_${Date.now()}`
  };
}
```

#### Node 3: HTTP Request (Send Response)
- **Method:** POST
- **URL:** `https://d3f4a81572c1.ngrok-free.app/webhook/chat-response`
- **Headers:**
  ```
  Content-Type: application/json
  ```
- **Body:**
```json
{
  "response": "{{$node[\"Function\"].json.response}}",
  "userId": "{{$node[\"Function\"].json.userId}}",
  "messageId": "{{$node[\"Function\"].json.messageId}}"
}
```

### 2. Expose Localhost to Internet

**Install ngrok:**
```bash
# Download dari https://ngrok.com
npm install -g ngrok
```

**Run ngrok:**
```bash
ngrok http 3002
```

**Update n8n webhook URL:**
```
https://[ngrok-generated-url]/webhook/chat-response
```

## 🧪 Testing Features

### Test Text Chat
1. Buka http://localhost:5000
2. Ketik pesan di input field
3. Klik Send atau tekan Enter
4. Pesan akan dikirim ke n8n
5. Response dari n8n akan muncul di chat

### Test File Upload
1. Klik tombol 📎 (attach file)
2. Pilih gambar/audio/dokumen
3. Preview akan muncul
4. Tambah text jika perlu
5. Klik Send
6. File akan dikirim sebagai base64 ke n8n

### Test Audio Recording
1. Klik tombol 🎤 (microphone)
2. Berikan permission microphone
3. Recording dimulai (tombol merah)
4. Klik "Recording... Click to stop" untuk stop
5. Audio tersimpan sebagai file OGG
6. Kirim seperti file biasa

### Test Mixed Content
1. Upload file/gambar
2. Ketik text message
3. Klik Send
4. n8n menerima JSON dengan text + base64 files

## 📁 Project Structure

```
etra_web/
├── src/
│   ├── main.ts              # Main application logic
│   ├── lappdelegate.ts      # Live2D delegate
│   ├── lappdefine.ts        # Configuration constants
│   └── ...                  # Other Live2D files
├── public/
│   ├── Core/                # Live2D Core files
│   ├── Framework/           # Live2D Framework
│   └── Resources/
│       ├── Haru/            # Haru Live2D model
│       ├── jingliu/         # jingliu Live2D model
│       ├── back_class_normal.png
│       └── icon_gear.png
├── webhook-server.js        # Express webhook server
├── package.json             # Dependencies & scripts
├── index.html               # Main HTML file
└── README-PROJECT.md        # This file
```

## 🚀 Production Deployment

### Build for Production
```bash
npm run build:prod
```

### Environment Variables
```bash
# .env file
WEBHOOK_URL=https://your-n8n-webhook-url
NODE_ENV=production
PORT=3002
```

### PM2 Process Manager
```bash
npm install -g pm2

# Run webhook server
pm2 start webhook-server.js --name "etra-webhook"

# Run frontend (static files)
pm2 serve dist 5000 --name "etra-frontend"
```

## 🔧 Troubleshooting

### Common Issues

**1. Port already in use:**
```bash
# Kill process on port 3002
npx kill-port 3002

# Or find and kill
netstat -ano | findstr :3002
taskkill /PID <PID> /F
```

**2. Microphone permission denied:**
- Pastikan HTTPS di production
- Atau izinkan microphone di browser settings

**3. WebSocket connection failed:**
- Pastikan webhook server running di port 3002
- Cek firewall settings

**4. File upload failed:**
- Cek file size (max 10MB)
- Pastikan file type supported
- Cek network connection

**5. n8n webhook not receiving:**
- Pastikan ngrok URL updated
- Cek n8n workflow aktif
- Verify webhook URL di n8n

### Debug Commands

**Check webhook server:**
```bash
curl http://localhost:3002/health
```

**Test webhook endpoint:**
```bash
curl -X POST http://localhost:3002/webhook/chat-response \
  -H "Content-Type: application/json" \
  -d '{"response": "Test", "userId": "test"}'
```

**Check ngrok tunnels:**
```bash
ngrok tunnels
```

## 📊 API Endpoints

### Webhook Server (Port 3002)

**POST /webhook/chat-response**
- Receive AI responses from n8n
- Broadcast to WebSocket clients

**POST /webhook/mixed-content**
- Handle mixed content (legacy)
- Now handled by base64 in JSON

**GET /health**
- Health check endpoint
- Returns server status

**POST /test**
- Test endpoint for debugging

### Frontend (Port 5000)

**WebSocket: ws://localhost:3002**
- Real-time communication
- Receive messages from webhook server

## 🎯 Feature Status

- ✅ **Live2D Integration** - Character rendering
- ✅ **Real-time Chat** - WebSocket communication
- ✅ **File Upload** - Base64 encoding
- ✅ **Audio Recording** - OGG format
- ✅ **Mixed Content** - Text + files
- ✅ **n8n Integration** - Webhook system
- ✅ **Responsive Design** - Mobile friendly
- ✅ **Dark Mode UI** - Modern interface
- ⏳ **AI Integration** - OpenAI API (postponed)
- ⏳ **Live2D Animations** - Expression changes (postponed)

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

This project uses Live2D Cubism SDK with their license terms.

## 📞 Support

For issues and questions:
1. Check troubleshooting section
2. Review n8n workflow configuration
3. Verify ngrok tunnel status
4. Check browser console for errors

---

**🎉 Happy coding with Etra - Your Live2D AI Assistant!**