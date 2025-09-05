const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware with increased payload limits for base64 data
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types for now
    cb(null, true);
  }
});

// Store connected clients
const clients = new Set();

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  clients.add(ws);

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Function to broadcast message to all connected clients
function broadcastMessage(message) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Webhook endpoint to receive messages from n8n (enhanced to handle base64 files)
app.post('/webhook/chat-response', (req, res) => {
  try {
    console.log('Received webhook from n8n:', req.body);

    // Check if the request contains base64 files
    const base64Files = req.body.files || [];
    console.log('Base64 files in request:', base64Files.length);

    const messageData = {
      id: req.body.messageId || generateMessageId(),
      timestamp: req.body.timestamp || new Date().toISOString(),
      type: req.body.messageType || 'text',
      content: req.body.response || req.body.content || 'No response content',
      userId: req.body.userId || 'system',
      sender: 'bot',
      originalMessageId: req.body.originalMessageId,
      files: base64Files,
      metadata: {
        ...req.body.metadata,
        fileCount: base64Files.length,
        hasFiles: base64Files.length > 0
      }
    };

    // Log file details if present
    if (base64Files.length > 0) {
      base64Files.forEach((file, index) => {
        console.log(`Base64 file ${index + 1}: ${file.name} (${file.size} bytes, ${file.type})`);
        console.log(`Data length: ${file.data ? file.data.length : 0} characters`);
      });
    }

    // Broadcast to all connected WebSocket clients
    broadcastMessage({
      type: 'chat_response',
      data: messageData
    });

    console.log('Message broadcasted to clients:', {
      id: messageData.id,
      type: messageData.type,
      content: messageData.content,
      fileCount: messageData.files.length
    });

    res.status(200).json({
      status: 'success',
      message: 'Response received and broadcasted',
      messageId: messageData.id,
      filesProcessed: base64Files.length
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process webhook',
      error: error.message
    });
  }
});

// Webhook endpoint to receive mixed content (text + files)
app.post('/webhook/mixed-content', upload.any(), (req, res) => {
  try {
    console.log('Received mixed content webhook from n8n');
    console.log('Files received:', req.files ? req.files.length : 0);
    console.log('Body:', req.body);

    const messageData = {
      id: req.body.messageId || generateMessageId(),
      timestamp: req.body.timestamp || new Date().toISOString(),
      type: req.body.messageType || 'mixed',
      content: req.body.content || '',
      userId: req.body.userId || 'system',
      sender: 'user',
      files: req.files || [],
      metadata: {
        fileCount: req.files ? req.files.length : 0,
        hasText: !!(req.body.content && req.body.content.trim()),
        ...req.body.metadata
      }
    };

    // Log file details
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        console.log(`File ${index + 1}: ${file.originalname} (${file.size} bytes, ${file.mimetype})`);
      });
    }

    // For now, just acknowledge receipt - you can process files here
    console.log('Mixed content processed successfully');

    res.status(200).json({
      status: 'success',
      message: 'Mixed content received and processed',
      messageId: messageData.id,
      filesProcessed: req.files ? req.files.length : 0
    });

  } catch (error) {
    console.error('Error processing mixed content webhook:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process mixed content',
      error: error.message
    });
  }
});

// Webhook endpoint to receive base64 content from n8n
app.post('/webhook/base64-content', (req, res) => {
  try {
    console.log('Received base64 content webhook from n8n:', req.body);

    // Extract base64 files from the request
    const base64Files = req.body.files || [];
    console.log('Base64 files received:', base64Files.length);

    const messageData = {
      id: req.body.messageId || generateMessageId(),
      timestamp: req.body.timestamp || new Date().toISOString(),
      type: req.body.messageType || 'mixed',
      content: req.body.content || '',
      userId: req.body.userId || 'system',
      sender: 'bot',
      files: base64Files,
      metadata: {
        fileCount: base64Files.length,
        hasText: !!(req.body.content && req.body.content.trim()),
        ...req.body.metadata
      }
    };

    // Log file details
    if (base64Files.length > 0) {
      base64Files.forEach((file, index) => {
        console.log(`Base64 file ${index + 1}: ${file.name} (${file.size} bytes, ${file.type})`);
        console.log(`Data length: ${file.data ? file.data.length : 0} characters`);
      });
    }

    // Broadcast to all connected WebSocket clients
    broadcastMessage({
      type: 'chat_response',
      data: messageData
    });

    console.log('Base64 content processed and broadcasted');

    res.status(200).json({
      status: 'success',
      message: 'Base64 content received and processed',
      messageId: messageData.id,
      filesProcessed: base64Files.length
    });

  } catch (error) {
    console.error('Error processing base64 content webhook:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process base64 content',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    clients: clients.size
  });
});

// Test endpoint
app.post('/test', (req, res) => {
  console.log('Test endpoint called:', req.body);

  const testMessage = {
    id: generateMessageId(),
    timestamp: new Date().toISOString(),
    type: 'text',
    content: `Test response: ${req.body.message || 'Hello from webhook server!'}`,
    userId: 'test',
    sender: 'bot'
  };

  broadcastMessage({
    type: 'chat_response',
    data: testMessage
  });

  res.json({ status: 'test message sent', messageId: testMessage.id });
});

// Generate unique message ID
function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

const PORT = process.env.PORT || 3002;


server.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook/chat-response`);
  console.log(`Base64 content endpoint: http://localhost:${PORT}/webhook/base64-content`);
  console.log(`Mixed content endpoint: http://localhost:${PORT}/webhook/mixed-content`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Test endpoint: http://localhost:${PORT}/test`);
  console.log('\nTo expose to internet, use ngrok:');
  console.log(`ngrok http ${PORT}`);
});

module.exports = app;