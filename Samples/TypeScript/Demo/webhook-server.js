const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Webhook endpoint to receive messages from n8n
app.post('/webhook/chat-response', (req, res) => {
  try {
    console.log('Received webhook from n8n:', req.body);

    const messageData = {
      id: req.body.messageId || generateMessageId(),
      timestamp: req.body.timestamp || new Date().toISOString(),
      type: req.body.messageType || 'text',
      content: req.body.response || req.body.content || 'No response content',
      userId: req.body.userId || 'system',
      sender: 'bot',
      originalMessageId: req.body.originalMessageId,
      metadata: req.body.metadata || {}
    };

    // Broadcast to all connected WebSocket clients
    broadcastMessage({
      type: 'chat_response',
      data: messageData
    });

    console.log('Message broadcasted to clients:', messageData);

    res.status(200).json({
      status: 'success',
      message: 'Response received and broadcasted',
      messageId: messageData.id
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

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook/chat-response`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Test endpoint: http://localhost:${PORT}/test`);
  console.log('\nTo expose to internet, use ngrok:');
  console.log(`ngrok http ${PORT}`);
});

module.exports = app;